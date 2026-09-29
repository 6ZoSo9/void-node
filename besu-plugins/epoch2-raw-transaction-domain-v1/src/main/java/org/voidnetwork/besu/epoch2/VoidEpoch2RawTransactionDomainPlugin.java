package org.voidnetwork.besu.epoch2;

import org.hyperledger.besu.datatypes.AccessListEntry;
import org.hyperledger.besu.datatypes.Transaction;
import org.hyperledger.besu.datatypes.TransactionType;
import org.hyperledger.besu.plugin.BesuPlugin;
import org.hyperledger.besu.plugin.ServiceManager;
import org.hyperledger.besu.plugin.services.TransactionValidatorService;

import java.math.BigInteger;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class VoidEpoch2RawTransactionDomainPlugin implements BesuPlugin {
  static final BigInteger CHAIN_ID = BigInteger.valueOf(2050L);
  static final String MARKER_ADDRESS = "0x0000000000000000000000000000000000002050";
  static final String MARKER_STORAGE_KEY =
      "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7";

  private ServiceManager serviceManager;

  @Override
  public void register(final ServiceManager context) {
    this.serviceManager = Objects.requireNonNull(context, "serviceManager");
  }

  @Override
  public void beforeExternalServices() {
    if (serviceManager == null) {
      throw new IllegalStateException("void_epoch2_service_manager_unavailable");
    }

    final TransactionValidatorService validatorService =
        serviceManager
            .getService(TransactionValidatorService.class)
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "void_epoch2_transaction_validator_service_unavailable"));

    validatorService.registerTransactionValidatorRule(
        VoidEpoch2RawTransactionDomainPlugin::validateTransaction);
  }

  static Optional<String> validateTransaction(final Transaction transaction) {
    if (transaction == null) {
      return Optional.of("void_epoch2_transaction_required");
    }

    final Optional<BigInteger> chainId = transaction.getChainId();
    if (chainId.isEmpty() || !CHAIN_ID.equals(chainId.get())) {
      return Optional.of("void_epoch2_chain_id_mismatch");
    }

    if (transaction.getType() != TransactionType.EIP1559) {
      return Optional.of("void_epoch2_type2_transaction_required");
    }

    final Optional<List<AccessListEntry>> accessList = transaction.getAccessList();
    if (accessList.isEmpty()) {
      return Optional.of("void_epoch2_signed_access_list_required");
    }

    int markerCount = 0;
    for (final AccessListEntry entry : accessList.get()) {
      if (!MARKER_ADDRESS.equalsIgnoreCase(entry.getAddressString())) {
        continue;
      }

      markerCount += 1;
      if (markerCount > 1) {
        return Optional.of("void_epoch2_marker_entry_count_invalid");
      }

      final List<String> storageKeys = entry.getStorageKeysString();
      if (storageKeys.size() != 1
          || !MARKER_STORAGE_KEY.equalsIgnoreCase(storageKeys.getFirst())) {
        return Optional.of("void_epoch2_marker_storage_key_invalid");
      }
    }

    if (markerCount != 1) {
      return Optional.of("void_epoch2_marker_entry_count_invalid");
    }

    return Optional.empty();
  }

  @Override
  public void start() {}

  @Override
  public void stop() {}
}
