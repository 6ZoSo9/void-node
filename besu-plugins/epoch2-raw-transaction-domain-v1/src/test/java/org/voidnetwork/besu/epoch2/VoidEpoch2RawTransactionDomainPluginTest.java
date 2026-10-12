package org.voidnetwork.besu.epoch2;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.hyperledger.besu.datatypes.AccessListEntry;
import org.hyperledger.besu.datatypes.Address;
import org.hyperledger.besu.datatypes.Transaction;
import org.hyperledger.besu.datatypes.TransactionType;
import org.hyperledger.besu.plugin.ServiceManager;
import org.hyperledger.besu.plugin.services.TransactionValidatorService;
import org.hyperledger.besu.plugin.services.txvalidator.TransactionValidationRule;

import java.lang.reflect.Proxy;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.apache.tuweni.bytes.Bytes32;
import org.junit.jupiter.api.Test;

final class VoidEpoch2RawTransactionDomainPluginTest {
  private static final AccessListEntry MARKER =
      new AccessListEntry(
          Address.fromHexString(VoidEpoch2RawTransactionDomainPlugin.MARKER_ADDRESS),
          List.of(Bytes32.fromHexString(VoidEpoch2RawTransactionDomainPlugin.MARKER_STORAGE_KEY)));

  private static final AccessListEntry EXTRA =
      new AccessListEntry(Address.fromHexString("0x0000000000000000000000000000000000000001"), List.of());

  @Test
  void acceptsExactEpoch2SignedDomain() {
    final Optional<String> result =
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(2050L, TransactionType.EIP1559, List.of(MARKER, EXTRA)));
    assertTrue(result.isEmpty());
  }

  @Test
  void rejectsWrongOrMissingChainId() {
    assertEquals(
        Optional.of("void_epoch2_chain_id_mismatch"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(1L, TransactionType.EIP1559, List.of(MARKER))));
    assertEquals(
        Optional.of("void_epoch2_chain_id_mismatch"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(null, TransactionType.EIP1559, List.of(MARKER))));
  }

  @Test
  void rejectsNonType2Transaction() {
    assertEquals(
        Optional.of("void_epoch2_type2_transaction_required"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(2050L, TransactionType.FRONTIER, List.of(MARKER))));
  }

  @Test
  void rejectsMissingOrDuplicateMarker() {
    assertEquals(
        Optional.of("void_epoch2_marker_entry_count_invalid"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(2050L, TransactionType.EIP1559, List.of(EXTRA))));
    assertEquals(
        Optional.of("void_epoch2_marker_entry_count_invalid"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(2050L, TransactionType.EIP1559, List.of(MARKER, MARKER))));
  }

  @Test
  void rejectsMissingAccessList() {
    assertEquals(
        Optional.of("void_epoch2_signed_access_list_required"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(2050L, TransactionType.EIP1559, null)));
  }

  @Test
  void rejectsWrongMarkerStorageKey() {
    final AccessListEntry wrong =
        new AccessListEntry(
            Address.fromHexString(VoidEpoch2RawTransactionDomainPlugin.MARKER_ADDRESS),
            List.of(Bytes32.fromHexString("0x" + "11".repeat(32))));
    assertEquals(
        Optional.of("void_epoch2_marker_storage_key_invalid"),
        VoidEpoch2RawTransactionDomainPlugin.validateTransaction(
            transaction(2050L, TransactionType.EIP1559, List.of(wrong))));
  }

  @Test
  void registersRuleAndFailsClosedWhenServiceMissing() {
    final VoidEpoch2RawTransactionDomainPlugin plugin =
        new VoidEpoch2RawTransactionDomainPlugin();

    final ServiceManager.SimpleServiceManager empty = new ServiceManager.SimpleServiceManager();
    plugin.register(empty);
    assertThrows(IllegalStateException.class, plugin::beforeExternalServices);

    final CapturingValidatorService service = new CapturingValidatorService();
    final ServiceManager.SimpleServiceManager manager = new ServiceManager.SimpleServiceManager();
    manager.addService(TransactionValidatorService.class, service);

    final VoidEpoch2RawTransactionDomainPlugin wired =
        new VoidEpoch2RawTransactionDomainPlugin();
    wired.register(manager);
    wired.beforeExternalServices();

    assertEquals(1, service.rules.size());
    assertTrue(
        service.rules
            .getFirst()
            .validate(transaction(2050L, TransactionType.EIP1559, List.of(MARKER)))
            .isEmpty());
  }

  private static Transaction transaction(
      final Long chainId, final TransactionType type, final List<AccessListEntry> accessList) {
    return (Transaction)
        Proxy.newProxyInstance(
            Transaction.class.getClassLoader(),
            new Class<?>[] {Transaction.class},
            (proxy, method, args) ->
                switch (method.getName()) {
                  case "getChainId" ->
                      chainId == null
                          ? Optional.<BigInteger>empty()
                          : Optional.of(BigInteger.valueOf(chainId));
                  case "getType" -> type;
                  case "getAccessList" -> Optional.ofNullable(accessList);
                  case "toString" -> "VoidEpoch2TestTransaction";
                  case "hashCode" -> System.identityHashCode(proxy);
                  case "equals" -> proxy == args[0];
                  default ->
                      throw new UnsupportedOperationException(
                          "unexpected_test_method:" + method.getName());
                });
  }

  private static final class CapturingValidatorService implements TransactionValidatorService {
    private final List<TransactionValidationRule> rules = new ArrayList<>();

    @Override
    public void registerTransactionValidatorRule(final TransactionValidationRule rule) {
      rules.add(rule);
    }
  }
}
