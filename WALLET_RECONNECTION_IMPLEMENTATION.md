# Wallet Reconnection and Session Restoration Implementation

## Overview
This document describes the implementation of wallet reconnection and session restoration features for Prompt Mint, ensuring users can seamlessly reconnect their wallets after temporary disconnections while maintaining security and backward compatibility.

## Expected Behavior

### Session Restoration (Automatic)
- **On App Mount**: The provider attempts to restore the previous session using saved wallet credentials from localStorage
- **Success**: If the wallet is available and unlocked, the session is restored automatically
- **Failure**: If the wallet is locked or unavailable, the status changes to "disconnected" with an appropriate error message

### Manual Reconnection
- Users can trigger manual reconnection via a "Reconnect" button when in "disconnected" state
- The reconnection function attempts to reconnect using saved credentials
- Reconnection is blocked if already connecting/reconnecting to prevent race conditions

### Automatic Reconnection Triggers
- **Window Focus**: When the user returns to the tab, the provider checks if the wallet account is still accessible
- **Wallet Events**: Listens for `stellar:accountChanged` and `stellar:networkChanged` events from wallet extensions
- **Retry Mechanism**: Limited to 3 automatic reconnection attempts to prevent infinite loops

### Status States
- `idle`: No wallet connected, no saved session
- `connecting`: Actively connecting to a wallet
- `connected`: Wallet is connected and operational
- `reconnecting`: Attempting to restore/reconnect a session
- `disconnected`: Session exists but wallet is unavailable/locked
- `error`: Connection or operation failed

## Implementation Details

### WalletProvider Enhancements

#### New Status Type
```typescript
export type WalletStatus = 
  | "idle" 
  | "connecting" 
  | "connected" 
  | "reconnecting" 
  | "error"
  | "disconnected"; // New status
```

#### New Context Function
```typescript
reconnect: () => Promise<void>; // Manual reconnection trigger
```

#### Reconnection Logic
- Checks for saved wallet ID in localStorage
- Validates not already connecting/reconnecting
- Attempts to get address and network info
- Updates storage with current address if changed
- Tracks analytics events for reconnection success/failure
- Resets reconnection attempts on manual connect/disconnect

#### Event Listeners
- Listens for `stellar:accountChanged` events to trigger reconnection when account changes
- Listens for `stellar:networkChanged` events to trigger reconnection when network changes
- Listens for window `focus` events to check wallet availability

#### Enhanced Session Restoration
- Sets status to "disconnected" instead of clearing storage on wallet lock
- Provides clear error messages for different failure scenarios
- Tracks session restoration events with analytics

### WalletButton Component Updates

#### New UI State
- Added "disconnected" state with orange-styled "Reconnect" button
- Button triggers the `reconnect()` function from context

#### Updated Imports
```typescript
const { address, status, error, connect, disconnect, reconnect } = useWallet();
```

## Error Handling

### Session Restoration Failures
- **Wallet Locked**: Status → "disconnected", Error → "Wallet is locked or not available"
- **Network Error**: Status → "disconnected", Error → "Session restoration failed"
- **No Address**: Status → "disconnected", Error → "Wallet is locked or not available"

### Reconnection Failures
- **No Saved Wallet ID**: Logs warning, does nothing
- **Already Connecting**: Returns early to prevent race conditions
- **Get Address Failure**: Status → "error", Error → "Failed to reconnect wallet"
- **No Address Returned**: Throws error, caught and sets error state

### Retry Mechanism
- Maximum 3 automatic reconnection attempts
- Attempts counter reset on manual connect/disconnect
- Prevents infinite reconnection loops

## Analytics Events

### New Events
- `wallet_connected` with `reconnected: true` flag for manual reconnection
- `wallet_connected` with `sessionRestored: true` flag for automatic session restoration
- `wallet_connect_failed` with `reasonCode: "reconnect_error"` for reconnection failures
- `wallet_connect_failed` with `reasonCode: "session_restore_error"` for session restoration failures

## Testing

### Test Coverage

#### Session Restoration Tests
1. `should restore session on mount with valid saved credentials`
   - Verifies automatic session restoration on provider mount
   - Confirms address and status are correctly restored

2. `should handle session restoration when wallet is locked`
   - Tests behavior when wallet returns no address (locked state)
   - Verifies status changes to "disconnected" with appropriate error

3. `should allow manual reconnection after failed session restoration`
   - Tests manual reconnection trigger after initial failure
   - Confirms successful reconnection updates state correctly

4. `should prevent reconnection when no wallet ID is saved`
   - Ensures reconnection is safely handled without saved credentials
   - Verifies status remains idle

5. `should handle wallet account change events`
   - Tests automatic reconnection on account change events
   - Confirms address updates correctly after account switch

6. `should reset reconnect attempts on manual disconnect`
   - Verifies reconnection attempt counter is reset on disconnect
   - Ensures storage is cleared properly

#### UI Component Tests
1. `shows disconnected state when wallet is disconnected`
   - Tests WalletButton displays "Reconnect" button in disconnected state
   - Verifies button styling and text

## Backward Compatibility

### Non-Breaking Changes
- **Additive Status**: New "disconnected" status doesn't affect existing status handling
- **Additive Function**: New `reconnect()` function is optional for consumers
- **Enhanced Logic**: Existing session restoration logic is improved, not replaced
- **Event Listeners**: New event listeners don't interfere with existing functionality

### Existing Flows Preserved
- Manual wallet connection flow unchanged
- Disconnect flow unchanged (still clears storage)
- Error handling enhanced but maintains existing error states
- Storage keys unchanged (walletId, walletAddress, walletNetwork, networkPassphrase)

### Migration Requirements
- **None**: No migration required. Changes are fully backward compatible.

## Security Considerations

### On-Chain Access Authority
- Reconnection does not bypass any existing permission checks
- Wallet signature requirements remain unchanged
- Network validation preserved during reconnection
- Storage only contains wallet ID and address (no sensitive keys)

### Session Data
- Only non-sensitive data stored in localStorage (wallet ID, address, network)
- No private keys or sensitive credentials stored
- Session restoration requires wallet to be unlocked by user

## Edge Cases Handled

1. **Wallet Extension Uninstalled**: Session restoration fails gracefully, user can reconnect manually
2. **Network Switch**: Reconnection triggered on network change events
3. **Account Switch**: Reconnection triggered on account change events
4. **Multiple Tabs**: Each tab manages its own session independently
5. **Browser Refresh**: Session automatically restored on page reload
6. **Wallet Lock**: Status changes to "disconnected" with clear error message
7. **Race Conditions**: Connection state checks prevent concurrent operations
8. **No Internet**: Network errors handled with appropriate error states

## Performance Considerations

- Event listeners properly cleaned up on unmount
- Reconnection attempts limited to prevent infinite loops
- Debounced focus event handling to prevent excessive checks
- Minimal localStorage operations (only on state changes)

## Future Enhancements

Potential improvements for future iterations:
- Configurable reconnection retry count
- Exponential backoff for reconnection attempts
- Support for multiple simultaneous wallets
- Session timeout with automatic disconnect
- Biometric reconfirmation for sensitive operations
