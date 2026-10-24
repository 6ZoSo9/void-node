#define PY_SSIZE_T_CLEAN
#include <Python.h>

#if !defined(__linux__) || !defined(__x86_64__)
#error "VOID V7 _voidfs bridge requires Linux x86-64"
#endif

#include <errno.h>
#include <fcntl.h>
#include <linux/fs.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>

#ifndef SYS_renameat2
#error "SYS_renameat2 is required"
#endif
#ifndef RENAME_NOREPLACE
#error "RENAME_NOREPLACE is required"
#endif

#define VOIDFS_MARKER "VOID_V7_STATIC_RENAME_NOREPLACE_BRIDGE_V1"
#define VOIDFS_MAX_LEAF_BYTES 255U

static bool
voidfs_clean_ascii_leaf(PyObject *obj, const char **out, Py_ssize_t *out_len)
{
    if (!PyUnicode_Check(obj)) {
        PyErr_SetString(PyExc_TypeError, "leaf_must_be_str");
        return false;
    }

    Py_ssize_t length = 0;
    const char *raw = PyUnicode_AsUTF8AndSize(obj, &length);
    if (raw == NULL) {
        return false;
    }
    if (length < 1 || length > (Py_ssize_t)VOIDFS_MAX_LEAF_BYTES) {
        PyErr_SetString(PyExc_ValueError, "leaf_length_invalid");
        return false;
    }
    if ((length == 1 && raw[0] == '.') ||
        (length == 2 && raw[0] == '.' && raw[1] == '.')) {
        PyErr_SetString(PyExc_ValueError, "dot_leaf_forbidden");
        return false;
    }

    for (Py_ssize_t i = 0; i < length; ++i) {
        const unsigned char ch = (unsigned char)raw[i];
        if (ch == 0 || ch == '/' || ch > 0x7fU) {
            PyErr_SetString(PyExc_ValueError, "leaf_ascii_single_component_required");
            return false;
        }
    }

    *out = raw;
    *out_len = length;
    return true;
}

static PyObject *
voidfs_rename_noreplace(PyObject *self, PyObject *args)
{
    (void)self;

    int parent_fd = -1;
    PyObject *old_obj = NULL;
    PyObject *new_obj = NULL;
    if (!PyArg_ParseTuple(args, "iOO:rename_noreplace",
                          &parent_fd, &old_obj, &new_obj)) {
        return NULL;
    }
    if (parent_fd < 0) {
        PyErr_SetString(PyExc_ValueError, "parent_fd_negative");
        return NULL;
    }

    struct stat parent_st;
    if (fstat(parent_fd, &parent_st) != 0) {
        return PyErr_SetFromErrno(PyExc_OSError);
    }
    if (!S_ISDIR(parent_st.st_mode)) {
        PyErr_SetString(PyExc_NotADirectoryError, "parent_fd_not_directory");
        return NULL;
    }

    const char *old_leaf = NULL;
    const char *new_leaf = NULL;
    Py_ssize_t old_len = 0;
    Py_ssize_t new_len = 0;
    if (!voidfs_clean_ascii_leaf(old_obj, &old_leaf, &old_len) ||
        !voidfs_clean_ascii_leaf(new_obj, &new_leaf, &new_len)) {
        return NULL;
    }
    if (old_len == new_len &&
        memcmp(old_leaf, new_leaf, (size_t)old_len) == 0) {
        PyErr_SetString(PyExc_ValueError, "source_and_target_must_differ");
        return NULL;
    }

    const long rc = syscall(SYS_renameat2,
                            parent_fd, old_leaf,
                            parent_fd, new_leaf,
                            RENAME_NOREPLACE);

    if (rc != 0) {
        return PyErr_SetFromErrno(PyExc_OSError);
    }
    Py_RETURN_NONE;
}

static PyMethodDef voidfs_methods[] = {
    {
        "rename_noreplace",
        voidfs_rename_noreplace,
        METH_VARARGS,
        PyDoc_STR("rename_noreplace(parent_fd, old_leaf, new_leaf) -> None")
    },
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef voidfs_module = {
    PyModuleDef_HEAD_INIT,
    "_voidfs",
    "VOID V7 built-in atomic no-replace filesystem bridge.",
    -1,
    voidfs_methods,
    NULL,
    NULL,
    NULL,
    NULL
};

PyMODINIT_FUNC
PyInit__voidfs(void)
{
    return PyModule_Create(&voidfs_module);
}
