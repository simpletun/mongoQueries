function() {
    var tempmarketplacestat = {};
    var query ={};
    var projection = {};
    var marketplaceOutputId = "";
    var submoduleId = "";
    var parentMmgId = "";
    var doc;
    var doc2;
    var cursor;
    var cursor2;
    var mydocument;
    var aggregateArray;
    var borrowed;
                function doMarketplaceAnalysis () {

                            //Assign collection name
                            var statCollectionName = 'marketplacestats';

                            db.getCollection(statCollectionName).drop();

                            projection = {_id: 1, name: 1, subModules: 1};

                            //Run query to get marketplaceoutput documents
                            cursor = db.getCollection('marketplaceoutput').find({}, projection);

                            //Loop over mastermodulegrid documents
                            while ( cursor.hasNext() ) {

                                    //store current mastermodulegrid document in variable 'doc'
                                    doc = cursor.next();

                                    //set marketplaceOutputId
                                    marketplaceOutputId = doc._id.valueOf();

                                    //Loop through subModules
                                    doc.subModules.forEach(function(submodule) {
                                        borrowed = false;

                                        submoduleId = submodule.subModuleId;

                                        query = {_id: ObjectId(submoduleId)};

                                        mydocument = db.submodule.findOne(query);
                                        parentMmgId = mydocument.parentMasterModuleGridId;

                                        query = [
                                            {$match: {_id: ObjectId(parentMmgId)}},
                                            {$unwind: "$modules"},
                                            {$unwind: "$modules.subModuleByChannelSegmentations"},
                                            {$unwind: "$modules.subModuleByChannelSegmentations.channelSegmentations"},
                                            {$match: {"modules.subModuleByChannelSegmentations.channelSegmentations.subModuleId" : submoduleId}},
                                            {$group: {
                                                _id: null,
                                                submoduleId: {$first: "$modules.subModuleByChannelSegmentations.channelSegmentations.subModuleId"},
                                                borrowed: {$first: "$modules.subModuleByChannelSegmentations.channelSegmentations.borrowedMasterModuleGridId"}
                                            }}
                                        ];

                                        aggregateArray = db.mastermodulegrid.aggregate(query).toArray();

                                        if(aggregateArray.length > 0){
                                            borrowed = (aggregateArray[0].borrowed) ? true : false;
                                            borrowedFrom = (aggregateArray[0].borrowed) ? aggregateArray[0].borrowed : "";
                                        }

                                        tempmarketplacestat = {
                                           marketplaceoutputId                                           : marketplaceOutputId,
                                           marketplaceOutputName                                    :  doc.name,
                                           submoduleId                                                   : submoduleId,
                                           parentMmgId                                                    : parentMmgId,
                                           borrowed                                                         : borrowed,
                                           borrowedFrom                                                 : borrowedFrom
                                        };


                                        //Query to find mmgStat record for this mmg Id.
                                        query = {"marketplaceOutputId" : marketplaceOutputId, "submoduleId": submoduleId};

                                        //Update collection with document, overwriting if already there and inserting if not
                                        db.getCollection(statCollectionName).update(
                                        query,
                                        tempmarketplacestat,
                                        {upsert: true}
                                    );

                                    });

                            }   //while ( cursor.hasNext() )

                            db.getCollection(statCollectionName).ensureIndex( { marketplaceOutputId:1} );

                }   //function doMarketplaceAnalysis (seasonCode)

                print(new Date() + ' analysis started');
                doMarketplaceAnalysis();
                print(new Date() + ' analysis done');
}