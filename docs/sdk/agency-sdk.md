# Agency SDK

The Agency SDK allows organizations to automate the creation and management of data labeling campaigns.

## Key Features

*   **Dataset Management**: Programmatically upload text or images to Vercel Blob or IPFS.
*   **Campaign Deployment**: Create and fund multiple campaigns in a single line of code.
*   **Real-time Analytics**: Stream labeling progress and worker accuracy metrics.

## Example: Creating a Campaign

```javascript
import { ArcWorkerAgency } from '@arc-worker/sdk';

const agency = new ArcWorkerAgency({
  apiKey: process.env.ARC_API_KEY
});

// 1. Prepare your data
const dataset = await agency.uploadDataset([
  { text: "Apple is a tech company in Cupertino.", id: "1" },
  { text: "Elon Musk founded SpaceX.", id: "2" }
]);

// 2. Deploy campaign
const campaign = await agency.createCampaign({
  title: "NER Entity Tagging",
  type: "ner",
  rewardPerTask: 0.15,
  requiredSubmissions: 3,
  verification: "consensus",
  labels: ["PERSON", "ORG", "GPE"],
  data: dataset
});

console.log(`Campaign Live: ${campaign.id}`);
```

## Integration with ML Pipelines

You can use the SDK within your CI/CD or training scripts to automatically trigger new labeling jobs when new un-labeled data arrives in your production database.
