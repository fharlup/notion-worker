// test-notion.js
require('dotenv').config();
const NOTION_TOKEN = process.env.NOTION_TOKEN; // GANTI INI!
const TEST_ID = process.env.TASK_DB_ID;

async function checkNotionID() {
  console.log("🔍 Testing Notion ID:", TEST_ID);
  console.log("🔑 Using token:", NOTION_TOKEN.substring(0, 10) + "...\n");

  // Test database endpoint
  try {
    const dbResponse = await fetch(
      `https://api.notion.com/v1/databases/${TEST_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28'
        }
      }
    );

    console.log("Database check status:", dbResponse.status);

    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log("\n✅ SUCCESS! This is a DATABASE");
      console.log("📝 Title:", dbData.title[0]?.plain_text);
      console.log("🎯 You can use this Database ID!\n");
      return;
    }

    const dbError = await dbResponse.json();
    console.log("❌ Database error:", dbError.message);
  } catch (error) {
    console.log("❌ Database fetch error:", error.message);
  }

  // Test page endpoint
  try {
    const pageResponse = await fetch(
      `https://api.notion.com/v1/pages/${TEST_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28'
        }
      }
    );

    console.log("\nPage check status:", pageResponse.status);

    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      console.log("\n⚠️ This is a PAGE, not a database");
      
      if (pageData.parent?.database_id) {
        console.log("🎯 PARENT DATABASE ID:", pageData.parent.database_id);
        console.log("   ↑ Use this ID instead!\n");
      } else {
        console.log("💡 This page is not inside a database\n");
      }
    } else {
      const pageError = await pageResponse.json();
      console.log("❌ Page error:", pageError.message);
    }
  } catch (error) {
    console.log("❌ Page fetch error:", error.message);
  }
}
async function searchDatabases() {
  try {
    const response = await fetch(
      'https://api.notion.com/v1/search',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'object',
            value: 'database'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          }
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.log("❌ Error:", data.message);
      return;
    }

    console.log(`\n📊 Found ${data.results.length} databases:\n`);
    
    data.results.forEach((db, index) => {
      const title = db.title[0]?.plain_text || 'Untitled';
      const id = db.id;
      
      console.log(`${index + 1}. ${title}`);
      console.log(`   ID: ${id}`);
      console.log(`   URL: ${db.url}\n`);
    });

    console.log("\n💡 Copy Database ID yang sesuai dengan 'Tasks' database kamu!");
    
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

searchDatabases();

checkNotionID();