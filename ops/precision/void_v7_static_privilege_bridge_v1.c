#define _GNU_SOURCE 1
#define PY_SSIZE_T_CLEAN
#include <Python.h>

#if !defined(__linux__) || !defined(__x86_64__)
#error "VOID _voidpriv experimental bridge requires Linux x86-64"
#endif

#include <errno.h>
#include <linux/capability.h>
#include <linux/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

#ifndef SYS_prctl
#error "SYS_prctl required"
#endif
#ifndef SYS_capset
#error "SYS_capset required"
#endif
#ifndef PR_SET_NO_NEW_PRIVS
#error "PR_SET_NO_NEW_PRIVS required"
#endif
#ifndef PR_GET_NO_NEW_PRIVS
#error "PR_GET_NO_NEW_PRIVS required"
#endif
#ifndef PR_CAP_AMBIENT
#error "PR_CAP_AMBIENT required"
#endif
#ifndef PR_CAP_AMBIENT_CLEAR_ALL
#error "PR_CAP_AMBIENT_CLEAR_ALL required"
#endif
#ifndef _LINUX_CAPABILITY_VERSION_3
#error "Linux capability v3 required"
#endif

#define VOIDPRIV_MARKER "VOID_V7_STATIC_PRIVILEGE_BRIDGE_REVIEW_V1"

static PyObject *
voidpriv_set_no_new_privs(PyObject *self, PyObject *unused)
{
    (void)self;
    (void)unused;
    if (syscall(SYS_prctl, PR_SET_NO_NEW_PRIVS, 1UL, 0UL, 0UL, 0UL) != 0) {
        return PyErr_SetFromErrno(PyExc_OSError);
    }
    if (syscall(SYS_prctl, PR_GET_NO_NEW_PRIVS, 0UL, 0UL, 0UL, 0UL) != 1) {
        PyErr_SetString(PyExc_RuntimeError, "no_new_privs_not_confirmed");
        return NULL;
    }
    Py_RETURN_NONE;
}

static PyObject *
voidpriv_clear_capabilities(PyObject *self, PyObject *unused)
{
    (void)self;
    (void)unused;
    /* Ensure there is no saved-root identity capable of regaining privilege. */
    uid_t real_uid, effective_uid, saved_uid;
    gid_t real_gid, effective_gid, saved_gid;
    if (getresuid(&real_uid, &effective_uid, &saved_uid) != 0 ||
        getresgid(&real_gid, &effective_gid, &saved_gid) != 0) {
        return PyErr_SetFromErrno(PyExc_OSError);
    }
    if (real_uid == 0 || real_gid == 0 ||
        real_uid != effective_uid || real_uid != saved_uid ||
        real_gid != effective_gid || real_gid != saved_gid) {
        PyErr_SetString(PyExc_PermissionError, "unprivileged_stable_identity_required");
        return NULL;
    }
    if (syscall(SYS_prctl, PR_GET_NO_NEW_PRIVS, 0UL, 0UL, 0UL, 0UL) != 1) {
        PyErr_SetString(PyExc_PermissionError, "no_new_privs_required_before_cap_clear");
        return NULL;
    }
    if (syscall(SYS_prctl, PR_CAP_AMBIENT, PR_CAP_AMBIENT_CLEAR_ALL,
                0UL, 0UL, 0UL) != 0) {
        return PyErr_SetFromErrno(PyExc_OSError);
    }
    struct __user_cap_header_struct header = {
        .version = _LINUX_CAPABILITY_VERSION_3,
        .pid = 0
    };
    struct __user_cap_data_struct data[2] = {{0}, {0}};
    if (syscall(SYS_capset, &header, data) != 0) {
        return PyErr_SetFromErrno(PyExc_OSError);
    }
    Py_RETURN_NONE;
}

static PyMethodDef voidpriv_methods[] = {
    {"set_no_new_privs", voidpriv_set_no_new_privs, METH_NOARGS,
     PyDoc_STR("Set and verify no_new_privs on the current process")},
    {"clear_capabilities", voidpriv_clear_capabilities, METH_NOARGS,
     PyDoc_STR("After UID/GID drop, clear ambient and process capabilities")},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef voidpriv_module = {
    PyModuleDef_HEAD_INIT,
    "_voidpriv",
    "Source-review candidate static privilege bridge for VOID V7",
    -1,
    voidpriv_methods,
    NULL, NULL, NULL, NULL
};

PyMODINIT_FUNC
PyInit__voidpriv(void)
{
    return PyModule_Create(&voidpriv_module);
}
