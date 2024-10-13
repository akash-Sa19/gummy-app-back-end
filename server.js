import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ApifyClient } from "apify-client";

dotenv.config({
  path: "./.env",
});
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

// Initialize the ApifyClient with your Apify API token
const client = new ApifyClient({
  token: process.env.VITE_APIFY_API_KEY, // Store token securely in environment variables
});

// Function to run the Apify actor and return results
async function runScraper(queryString, orderBy, searchType, maxResult, sortBy) {
  // Prepare the input data for the Apify Reddit scraper actor
  const input = {
    startUrls: [
      {
        url: `https://www.reddit.com/search/?q=${queryString}`,
      },
    ],
    sort: sortBy,
    type: searchType,
    maxItems: maxResult,
    // maxPostCount: 10,
    maxComments: 5,
    maxCommunitiesCount: 2,
    maxUserCount: 2,
    scrollTimeout: 40,
    time: orderBy,
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };
  try {
    // Run the Apify actor
    const run = await client.actor("trudax/reddit-scraper").call(input);

    // Fetch and return results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
  } catch (error) {
    console.error("Error running Apify Actor:", error);
    throw error;
  }
}

// Initialize Express server
const app = express();
app.use(express.json());
app.use(cors(corsOptions));
const PORT = process.env.PORT || 3001;

// Set up a route to serve the home page
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Set up a route to trigger the Apify scraping
app.post("/scrape", async (req, res) => {
  //   console.log("server/line:67 ->", req);
  // Access the data sent from the client-side
  const { queryString, orderBy, searchType, maxResult, sortBy } = req.body;
  //   console.log("Received Data:", {
  //     queryString,
  //     orderBy,
  //     searchType,
  //     maxResult,
  //   });
  try {
    const result = await runScraper(
      queryString,
      orderBy,
      searchType,
      maxResult,
      sortBy
    ); // Call the scraping function
    res.json({
      success: true,
      data: result, // Send the scraped data as JSON
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error occurred during scraping",
      error: error.message,
    });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
