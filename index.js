var chalk = require('chalk');
const readlineSync = require('readline-sync');
const ebay = require('ebay-api');
const API_KEY = "Crossrid-CrossBot-PRD-18a129233-d465d4c0";

var params = {
  keywords: [],

  // add additional fields
  outputSelector: ['AspectHistogram'],

  paginationInput: {
    entriesPerPage: 10
  },
  itemFilter: [],
  aspectFilter: [],
  domainFilter: []
};


// Wait for user's response. 
var keyword = readlineSync.question('Hi there, what would you like to buy? \n');
params.keywords.push(keyword);

// Free shipping
if (readlineSync.keyInYNStrict('Only free shipping?')) {
  params.itemFilter.push({name: 'FreeShippingOnly', value: true})
}

// Price limit
if (readlineSync.keyInYNStrict('Do you have a price limit?')) {
  // Yes
  var maxPrice = readlineSync.question('Cool, so please write your limit (in $): ');
  params.itemFilter.push({name: 'MaxPrice', value: maxPrice})
}

// Gathering specific aspects
console.log(chalk.yellow("Searching items..."));
ebay.xmlRequest({
    serviceName: 'Finding',
    opType: 'findItemsByKeywords',
    appId: API_KEY,
    params: params,
    parser: ebay.parseResponseJson    // (default)
  },
  // gets all the items together in a merged array
  function itemsCallback(error, itemsResponse) {
    if (error) {
      console.log(chalk.green("Sorry, something went wrong:", error));
    } else if (itemsResponse.aspectHistogramContainer) {
      var aspects = itemsResponse.aspectHistogramContainer.aspect;
      var totalEntries = itemsResponse.paginationOutput.totalEntries;
      if (aspects.length > 0) {
        if (readlineSync.keyInYNStrict(`We found ${totalEntries} items. Would you like to filter these results?`)) {
          // Showing some of the resulted aspects to filter from
          var allAspectsNames = [];
          var allAspectsOptions = [];
          for (var i = 0; i < aspects.length; i++) {
            var aspectName = aspects[i].$.name;
            var aspectOptions = [];
            
            for (var j = 0; j < aspects[i].valueHistogram.length; j++) {
              aspectOptions.push(aspects[i].valueHistogram[j].$.valueName);
              if (j == 34) {
                break;
              }
            };

            // building array of names
            allAspectsNames.push(aspectName);
            allAspectsOptions.push(aspectOptions);
          }

          var aspectIndexChoosen = readlineSync.keyInSelect(allAspectsNames, "Choose one aspect");
          if (aspectIndexChoosen > -1) {
            // User choose a correct aspect we need to filter by
            var specificAspectFilterIndex = readlineSync.keyInSelect(allAspectsOptions[aspectIndexChoosen], `Choose one ${allAspectsNames[aspectIndexChoosen]}`);
            if (specificAspectFilterIndex > -1) {
              params.aspectFilter.push({
                aspectName: allAspectsNames[aspectIndexChoosen],
                aspectValueName: allAspectsOptions[aspectIndexChoosen][specificAspectFilterIndex]
              })
            }
          }
        }
      }
    }

    if (params.aspectFilter.length > 0) {
      console.log(chalk.yellow("Filtering items...\n"));
      ebay.xmlRequest({
          serviceName: 'Finding',
          opType: 'findItemsByKeywords',
          appId: API_KEY,
          params: params,
          parser: ebay.parseResponseJson    // (default)
        },
        showResults
      );
    } else {
      showResults(error, itemsResponse);
    }
  }
);


function showResults(error, itemsResponse) {
  if (error) {
    console.log("Sorry, something went wrong:", error);
  } else {
    if (itemsResponse.searchResult.$.count > 0) {
      var totalEntries = itemsResponse.paginationOutput.totalEntries;
      var items = itemsResponse.searchResult.item;
      console.log(`***** Found ${totalEntries} items *****\n\n`);
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        console.log(chalk.bgGreen(`${item.title} - (${item.itemId})`));
        console.log(chalk.green(`Price: ${item.sellingStatus.currentPrice.amount} ${item.sellingStatus.currentPrice.currencyId}`));
        console.log(chalk.green('image:', item.galleryURL));
        console.log(chalk.green('ebay url:', item.viewItemURL));
      }  
    } else {
      console.log("There are no results for your search.");
    }
  }
}