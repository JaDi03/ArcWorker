# Verification Methods

ArcWorker provides three main layers of quality assurance for your data.

## 1. Golden Set (Auto-Verify)

The most efficient method for standardized tasks.
*   **How it works**: The agency provides a "Golden Set" of 5-10 tasks where the answers are already known.
*   **Flow**: These tasks are hidden within the campaign. If a worker answers the Golden Tasks correctly, the system assumes they are working honestly and triggers auto-payout for all their subsequent tasks in that campaign.
*   **Best for**: Sentiment Analysis, Simple Image Classification.

## 2. Consensus

Harnesses the "Wisdom of the Crowds".
*   **How it works**: Every task is assigned to N different workers (e.g., 3 workers).
*   **Flow**: Once all N workers submit, the system compares the results. If a majority matches (e.g., 2 out of 3), the payment is released to the majority.
*   **Best for**: Bounding Boxes, Audio Transcription.

## 3. Manual Review

Direct control for specialized data.
*   **How it works**: The agency reviews every submission in their dashboard.
*   **Flow**: Agency clicks "Approve & Pay" or "Reject". Rejections require a reason and do not trigger a payout.
*   **Best for**: Complex NER, Creative Writing, Subjective Surveys.
