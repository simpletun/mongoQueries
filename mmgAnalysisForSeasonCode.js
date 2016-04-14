function(seasonCode) {
    var tempmmgstat = {};
    var query ={};
    var mmgId = "";
                function doMMGAnalysisForSeason (seasonCode) {

                            //Set up variables
                            //Query by seasonCode
                            var query =  {"seasonCode" : seasonCode} ;

                            //Set up submodule counters
                            var submoduleNamesCount=0;
                            var usedSubmoduleCount=0;

                            //Assign collection name
                            var statCollectionName = 'mmgStats';

                            //Run query to get mastermodulegrid documents for seasonCode
                            var cursor = db.getCollection('mastermodulegrid').find(query);

                            //Loop over mastermodulegrid documents
                            while ( cursor.hasNext() ) {

                                    //Reset submodule counters for each mastermodulegrid
                                    submoduleNamesCount=0;
                                    usedSubmoduleCount=0;

                                    //store current mastermodulegrid document in variable 'doc'
                                    var doc = cursor.next();

                                    //set mmgId
                                    mmgId = doc._id.valueOf();

                                    //TODO: Add comma delimited user list
                                    //Begin -- Get write user list


                                    //End -- Get write user list


                                    //Calculate submodule counts by looping through modules
                                    doc.modules.forEach(function(module) {

                                        // the count of submodule names in the MMG is equal to the total number of subModuleByChannelSegmentations
                                        // objects in all the mmg's modules.  Running count is kept here
                                        submoduleNamesCount += module.subModuleByChannelSegmentations.length;

                                        // Now loop over subModuleByChannelSegmentation objects for each submodule and count child channelSegmentations objects
                                        // The count of channelSegmentations objects is equal to the number of used submodules in the mmg
                                        module.subModuleByChannelSegmentations.forEach(function(subModuleByChannelSegmentation) {
                                            if (subModuleByChannelSegmentation.channelSegmentations) {

                                                // Increment use submodule counter here
                                                usedSubmoduleCount += subModuleByChannelSegmentation.channelSegmentations.length;

                                            }//if (subModuleByChannelSegmentation.channelSegmentations) {
                                        });
                                    });

                                    // The total number of possible submodules in an MMG is equal to the number of submodule names times the number of channel segmentations (29)
                                    var totalsubmodulecount = submoduleNamesCount * 29;

                                    // Now do a query to find the number of empty submodules by querying the submodule collection
                                    // This query looks for global submodules
                                    query = {"parentMasterModuleGridId" : mmgId, linePlanId: 1, offerings: []};
                                    var globalEmptyCount = db.submodule.find(query).count();

                                    // Set new document to be added to mmgStats collection with all variables.
                                    tempmmgstat = {
                                           mmgId: mmgId,
                                           seasonCode                                                   : doc.seasonCode,
                                           genderCode                                                   : doc.genderCode,
                                           ageCode                                                        : doc.ageCode,
                                           categoryCode                                                 : doc.categoryCode,
                                           divisionCode                                                   : doc.divisionCode,
                                           submoduleNames                                           : submoduleNamesCount,
                                           totalSubmodules                                              : totalsubmodulecount,
                                           usedSubmodules                                           : usedSubmoduleCount,
                                           emptySubmodules                                           : globalEmptyCount
                                   };

                                    //Begin -- Find submodule counts by level
                                    //This query will find all submodule records for the mmg grouped by line plan id
                                    query = [
                                        {
                                            $match: {"parentMasterModuleGridId" : mmgId}
                                        },
                                        {   $group: {
                                            _id: "$linePlanId",
                                            submoduleCount: {$sum: 1}
                                        }}
                                    ];

                                    //Set up query vars for next few queries
                                    var aggregateArray;
                                    var currentLinePlan;
                                    var i;
                                    var myLineString = "";

                                    //Run query and load into array, since this will only ever return one document
                                    aggregateArray = db.submodule.aggregate(query).toArray();

                                    //Iterate over array which is grouped by line plan id
                                    for (i = 0; i < aggregateArray.length; i++){
                                        currentLinePlan = aggregateArray[i]._id;

                                        switch(currentLinePlan){
                                            case 1:
                                                myLineString = "global";
                                                break;
                                            case 2:
                                                myLineString = "geo";
                                                break;
                                            case 3:
                                                myLineString = "country";
                                                break;
                                            default:
                                                //do nothing
                                        }

                                        tempmmgstat[myLineString + "SubmoduleDocuments"] = (aggregateArray[i].submoduleCount) ? aggregateArray[i].submoduleCount : 0;
                                    }

                                    //End -- Find submodule counts by level

                                    //Begin -- find submodule offering count stats by level
                                    //Set up aggregate query that will calculate offerings counts, total for MMG, avg/min/max per submodule
                                    query = [
                                        {
                                            $match: {"parentMasterModuleGridId" : mmgId, offerings: {$ne: []}}
                                        },
                                        {   $group: {
                                            _id: "$linePlanId",
                                            totalMMGOfferings                    : {$sum: { $size: "$offerings"}},
                                            avgOfferingsPerSubmodule       : {$avg: {$size: "$offerings"}},
                                            minOfferingsPerSubmodule       : {$min: {$size: "$offerings"}},
                                            maxOfferingsPerSubmodule       : {$max: {$size: "$offerings"}}
                                        }}
                                    ];

                                    //Run query and load into array, since this will only ever return one document
                                    aggregateArray = db.submodule.aggregate(query).toArray();

                                    //Iterate over array which is grouped by line plan id
                                    for (i = 0; i < aggregateArray.length; i++){
                                        currentLinePlan = aggregateArray[i]._id;

                                        switch(currentLinePlan){
                                            case 1:
                                                myLineString = "global";
                                                break;
                                            case 2:
                                                myLineString = "geo";
                                                break;
                                            case 3:
                                                myLineString = "country";
                                                break;
                                            default:
                                                //do nothing
                                        }

                                        tempmmgstat[myLineString + "TotalOfferings"] = (aggregateArray[i].totalMMGOfferings) ? aggregateArray[i].totalMMGOfferings : 0;
                                        tempmmgstat[myLineString + "AvgOfferingsPerSubmodule"] = (aggregateArray[i].avgOfferingsPerSubmodule) ? aggregateArray[i].avgOfferingsPerSubmodule : 0;
                                        tempmmgstat[myLineString + "MinOfferingsPerSubmodule"] = (aggregateArray[i].minOfferingsPerSubmodule) ? aggregateArray[i].minOfferingsPerSubmodule : 0;
                                        tempmmgstat[myLineString + "MaxOfferingsPerSubmodule"] = (aggregateArray[i].maxOfferingsPerSubmodule) ? aggregateArray[i].maxOfferingsPerSubmodule : 0;
                                    }

                                    //End -- find submodule offering count stats by level

                                    //Begin -- Get offering instance counts

                                    //Query to count offering instances, which depends on attributes subdocument size, child of offerings array
                                   query = [
                                        {
                                            $match: {"parentMasterModuleGridId" : mmgId, offerings: {$ne: []}}
                                        },
                                        {
                                            $unwind: "$offerings"
                                        },
                                        {
                                            $unwind: "$offerings.attributes"
                                        },
                                        {
                                            $group: {
                                                _id: "$_id",
                                                linePlanId                          : { $first: "$linePlanId"},
                                                offeringInstances                    : { $sum: 1}
                                            }
                                        },
                                        {
                                            $group: {
                                                _id: "$linePlanId",
                                                totalOfferingInstances                  : {$sum: "$offeringInstances"},
                                                avgOfferingsInstances                   : {$avg: "$offeringInstances"},
                                                maxOfferingsInstances                   : {$max: "$offeringInstances"},
                                                minOfferingsInstances                   : {$min: "$offeringInstances"}
                                            }
                                        }
                                    ];

                                    aggregateArray = db.submodule.aggregate(query).toArray();

                                    //Iterate over array which is grouped by line plan id
                                    for (i = 0; i < aggregateArray.length; i++){
                                        currentLinePlan = aggregateArray[i]._id;

                                        switch(currentLinePlan){
                                            case 1:
                                                myLineString = "global";
                                                break;
                                            case 2:
                                                myLineString = "geo";
                                                break;
                                            case 3:
                                                myLineString = "country";
                                                break;
                                            default:
                                                //do nothing
                                        }

                                        tempmmgstat[myLineString + "TotalOfferingInstances"] = (aggregateArray[i].totalOfferingInstances) ? aggregateArray[i].totalOfferingInstances : 0;
                                        tempmmgstat[myLineString + "AvgOfferingInstancesPerSubmodule"] = (aggregateArray[i].avgOfferingsInstances) ? aggregateArray[i].avgOfferingsInstances : 0;
                                        tempmmgstat[myLineString + "MinOfferingInstancesPerSubmodule"] = (aggregateArray[i].minOfferingsInstances) ? aggregateArray[i].minOfferingsInstances : 0;
                                        tempmmgstat[myLineString + "MaxOfferingInstancesPerSubmodule"] = (aggregateArray[i].maxOfferingsInstances) ? aggregateArray[i].maxOfferingsInstances : 0;
                                    }

                                   //End -- Get offering instance counts

                                   // Begin -- Get ChannelSeg stats, counts offering instances grouped by channel seg id
                                   query = [
                                        {
                                            $match: {"parentMasterModuleGridId" : mmgId, offerings: {$ne: []}, linePlanId: 1}
                                        },
                                        {
                                            $unwind: "$offerings"
                                        },
                                        {
                                            $unwind: "$offerings.attributes"
                                        },
                                        {
                                            $group: {
                                                _id: "$_id",
                                                channelSeg                          : { $first: "$channelSegmentationId"},
                                                offeringInstances                    : { $sum: 1}
                                            }
                                        },
                                        {
                                            $group: {
                                                _id: "$channelSeg",
                                                totalInstances          : {$sum: "$offeringInstances"}
                                            }
                                        }
                                    ];

                                    var channelSeg = 0;

                                    //Run query and load into array, since this will only ever return one document
                                    aggregateArray = db.submodule.aggregate(query).toArray();

                                    //Iterate over array which is grouped by line plan id
                                    for (i = 0; i < aggregateArray.length; i++){
                                        channelSeg = aggregateArray[i]._id;
                                        tempmmgstat[channelSeg + "_OfferingInstances"] = (aggregateArray[i].totalInstances) ? aggregateArray[i].totalInstances : 0;
                                    }

                                    // End -- Get ChannelSeg stats, counts offering instances grouped by channel seg id

                                   //Query to find mmgStat record for this mmg Id.
                                   query = {"mmgId" : mmgId};

                                   //Update collection with document, overwriting if already there and inserting if not
                                   db.getCollection(statCollectionName).update(
                                        query,
                                        tempmmgstat,
                                        {upsert: true}
                                    );
                            }   //while ( cursor.hasNext() )

                            db.getCollection(statCollectionName).ensureIndex( { mmgId:1} );

                }   //function doMMGAnalysisForSeason (seasonCode)

                print(new Date() + ' '+seasonCode+' analysis started');
                doMMGAnalysisForSeason(seasonCode);
                print(new Date() + ' '+seasonCode+' analysis done');
}