# Indexer Reconciliation Against Contract State (Issue #96)

## Overview
The indexer reconciliation system validates that the off-chain database state matches the on-chain contract state. This ensures data integrity and catches indexing errors, missed events, or discrepancies.

## Reconciliation Process

### What Gets Checked
For each prompt with an `onChainId`:
1. **Existence**: Prompt exists in contract
2. **Price**: Database price matches contract price
3. **Active Status**: Database `isActive` matches contract status
4. **Sales Count**: (Future) Validate purchase count

### Auto-Fix Behavior
When a discrepancy is detected:
- **Price Mismatch**: Updates DB to match contract (source of truth)
- **Status Mismatch**: Updates DB to match contract
- **Missing in Contract**: Logs discrepancy, no auto-fix

### Execution Schedule
- **Automatic**: Runs every 24 hours
- **Manual**: Can be triggered via admin API (future)
- **On-Demand**: Run during deployment or maintenance

## API (Future)

### Trigger Reconciliation
```http
POST /api/admin/reconcile
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "totalChecked": 150,
  "discrepancies": [
    {
      "onChainId": "1234",
      "issue": "Price mismatch",
      "dbValue": 10.5,
      "contractValue": 12.0
    }
  ],
  "fixed": 1,
  "errors": []
}
```

## Implementation

### Service Module
**Location:** `server/src/services/indexerReconciliation.ts`

```typescript
import { reconcileIndexerState, startReconciliationScheduler } from './services/indexerReconciliation';

// Run once
const result = await reconcileIndexerState();

// Start background scheduler
startReconciliationScheduler();
```

### Integration with Indexer
Start the reconciliation scheduler alongside the main indexer:
```typescript
import { startIndexer } from './services/indexer';
import { startReconciliationScheduler } from './services/indexerReconciliation';

startIndexer();
startReconciliationScheduler();
```

## Discrepancy Types

### Price Mismatch
**Cause:** Missed `PromptPriceUpdated` event or indexer lag  
**Resolution:** Update DB price to match contract  
**Impact:** Medium - affects marketplace display

### Active Status Mismatch
**Cause:** Missed `PromptSaleStatusUpdated` event  
**Resolution:** Update DB status to match contract  
**Impact:** High - may show unavailable prompts as active

### Missing in Contract
**Cause:** DB entry created without on-chain transaction  
**Resolution:** Flag for manual review  
**Impact:** High - indicates data integrity issue

### Missing in DB
**Cause:** Indexer missed `PromptCreated` event  
**Resolution:** Re-index from that ledger  
**Impact:** High - prompt not discoverable

## Error Handling
- **Network Errors**: Logged, reconciliation continues
- **Contract Read Failures**: Logged per-prompt, doesn't stop batch
- **Database Errors**: Fatal, stops reconciliation
- **Rate Limiting**: Implements exponential backoff

## Monitoring & Alerts
Log key metrics:
- Total prompts reconciled
- Discrepancies found
- Auto-fixes applied
- Errors encountered
- Execution time

**Alert Triggers:**
- Discrepancy rate > 5%
- Reconciliation fails 3x consecutively
- Execution time > 10 minutes

## Edge Cases
- **New Prompts**: Skip if created within last 5 minutes (indexer lag)
- **Archived Prompts**: Still reconcile to ensure historical accuracy
- **Deleted Prompts**: Mark as archived if removed from contract
- **Contract Upgraded**: May need schema migration logic

## Performance Considerations
- **Batch Size**: Process 100 prompts at a time
- **Rate Limiting**: Max 10 contract reads/second
- **Parallel Reads**: Use Promise.all for batch queries
- **Caching**: Cache contract reads for 60 seconds

## Future Enhancements
- Reconcile sales counts from `Purchase` events
- Validate encrypted payload hashes
- Check creator ownership changes
- Reconcile subscription states
- Generate reconciliation reports
- Slack/email notifications on critical discrepancies
