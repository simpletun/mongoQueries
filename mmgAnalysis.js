function() {
    var querySeasonCode = db.mastermodulegrid.distinct( "seasonCode" );
    querySeasonCode.forEach(function(seasonCode){
        mmgAnalysisForSeason(seasonCode);
    });
}