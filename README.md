# shieldNet-HackWarz2k26# shieldNet-HackWarz2k26
ShieldNet – AI Powered Misinformation Detection

Project Overview
ShieldNet is an AI-powered misinformation detection system designed to identify fake or misleading content across social media platforms.

The system analyzes text such as tweets, posts, news captions, or messages and determines whether the information is likely real or fake using machine learning models.

ShieldNet helps users verify information quickly before sharing it, reducing the spread of misinformation online.

Problem Statement
Misinformation spreads rapidly across social media, often reaching thousands of people before it is verified.

Many users unknowingly share misleading or false information because there is no simple tool to verify content instantly.

ShieldNet solves this problem by providing real-time AI analysis of social media content.

Proposed Solution
ShieldNet allows users to paste social media content into the app and instantly receive:

Fake Score – Probability that the content is misinformation
AI Explanation – Reasoning behind the classification

The system uses Natural Language Processing (NLP) models to detect patterns commonly associated with misinformation.

Key Features

Analyze Social Media Content
Users can paste any text such as tweets, captions, posts, or news headlines.

The AI model analyzes the text and returns a fake score and explanation.

AI Explanation System
Instead of only labeling content as fake, ShieldNet explains why the content might be misleading.

Example output:

Fake Score: 82%

Explanation:
The post contains exaggerated claims and lacks references to credible sources.

Alerts System
The system flags suspicious posts and displays them in an alerts dashboard for further review.

Analytics Dashboard
The app displays insights such as:

Total detections
Accuracy rate
Detection trends
Platform distribution

System Architecture

User Input (Mobile App / Extension)
↓
API Server
↓
AI Detection Model (NLP)
↓
Fake Score + AI Explanation
↓
Result Display

Components

Frontend
React Native (Expo)

Backend
Node.js / Express

AI Model
HuggingFace Transformers
DistilBERT / RoBERTa

Technology Stack

Frontend
React Native (Expo)
TypeScript

Backend
Node.js / Express

Machine Learning
HuggingFace Transformers
DistilBERT / RoBERTa models

APIs
HuggingFace Inference API
Wikipedia API for fact verification

Setup and Installation Guide

Clone the Repository

git clone https://github.com/your-repo/shieldnet
cd shieldnet

Install Dependencies

Frontend

cd app
npm install

Backend

cd backend
npm install

Start Backend Server

npm start

Server will run on

http://localhost:5000

Start Mobile App

cd app
npx expo start

Scan the QR code using Expo Go.

Example API Request

Endpoint

POST /api/analyze

Request

{
"text": "Government hiding secret vaccine data"
}

Response

{
"fake_score": 0.82,
"explanation": "The content contains exaggerated claims and lacks references to reliable sources."
}

AI Usage Disclosure

This project uses AI tools and models for misinformation detection.

AI Tools Used

HuggingFace Transformers
Pretrained NLP models

Purpose

Classify social media content as real or fake
Generate explanations for AI predictions

All AI usage has been disclosed as required by hackathon guidelines.

Expected Impact

ShieldNet helps users:

Verify social media information quickly
Prevent misinformation spread
Make informed decisions before sharing content

Team Members

Suraj Chavan
McKenzie Pereira
Blaze D'sa

Future Improvements

Deepfake detection
Image misinformation analysis
Multilingual support
Real-time social media scanning
Community reporting system

Conclusion

ShieldNet combines artificial intelligence, real-time analysis, and user-friendly tools to detect misinformation and promote responsible information sharing online.
