# Supported Task Types

ArcWorker supports a wide range of data labeling tasks specialized for various AI industries.

## Computer Vision

### Object Detection (Bounding Box)
Draw rectangles around objects. Used for autonomous driving, robotics, and security systems.
*   **Output**: [x, y, width, height] coordinates per label.

### Image Classification
Choose the correct category for an image.
*   **Output**: Selected category ID.

### Semantic Segmentation
Pixel-wise classification. Perfect for precise medical imaging or complex outdoor navigation.

## Natural Language Processing (NLP)

### Named Entity Recognition (NER)
Identify and highlight entities like People, Places, and Organizations.
*   **Output**: [start_offset, end_offset, tag_id] annotations.

### Sentiment Analysis
Classify the emotional tone of a text (Positive, Negative, Neutral).

## Data Collection & Surveys

### Structured Forms
Collect answers to specific questions or conduct market research.
*   **Output**: JSON object with form responses.
