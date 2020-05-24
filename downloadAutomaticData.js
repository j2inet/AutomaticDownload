var  https = require('https');
const fs = require('fs');
const path = require('path');


const  EARLIEST_YEAR = 2013;


if(!process.env.AutomaticTokens) {
    console.error('You have not passed an authorization roken for this to use.')    
    console.error('Set the environment variable [AutomaticTokens] to a commma delimited list of your authorization tokens (no spaces)');
    console.error('IF you only have one account you will only be passing one token. ')
    return;
}
var AutomaticTokensString = process.env.AutomaticTokens;
const AutomaticTokenList = AutomaticTokensString.split(',');
var AuthorizationToken = '';
var vehicleList;

function AutomaticAPI(path) {
    return new Promise((resolve,reject)=> {
        var options = {
            host: 'api.automatic.com',
            path: path,
            port:443,
            method: 'GET',
            headers: {Authorization:`Bearer ${AuthorizationToken}`}
        };
    
        var req = https.request(options,function(res) {
            let data = ''
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end',()=> {
                resolve(JSON.parse(data));
            });
        });
    
        req.on('error', function(e) {
            console.error('error',e);
            console.log('problem with request: ' + e.message);
            reject(e);
          });    
          req.end();
    });
}


function getMil(vehicleID, limit,) {
    return new Promise((resolve,reject)=>{
        var url = `/vehicle/${vehicleID}/mil/`;
        //console.debug('url',url);
        AutomaticAPI(url)
        .then((data)=>resolve(data));
    });
}

function listVehicles() {    
    return new Promise((resolve,reject)=>{
        AutomaticAPI('/vehicle/')
        .then((d)=>{
            console.log(d);
            resolve(d);
        })    
    });
}


function getUser(userID) {
    return new Promise((resolve,reject)=>{
        AutomaticAPI(`/user/${userID}/`)
        .then((d)=>{
            resolve(d);
        })    
    })
}

function getUserProfile(userID) {
    return new Promise((resolve,reject)=>{
        AutomaticAPI(`/user/${userID}/profile/`)
        .then((d)=>{
            resolve(d);
        })    
    })
}


function persistTrips(folderPath,startDate, endDate) {
    if (!fs.existsSync(folderPath)){
        fs.mkdirSync(folderPath);
    } 
    var startTicks = (startDate.getTime())/1000;
    var endTicks = (endDate.getTime())/1000;
    var responses = []; 

    var url = `/trip/?started_at__gte=${startTicks}&started_at__lte=${endTicks}&limit=250`;
    return new Promise((resolve,reject)=> {
        var onDataReturned = function(data) {
            if(data.results != null) {
                data.results.forEach(trip=>{
                    var vehicleUrlParts = trip.vehicle.split("/");
                    var tripStartDate = new Date(trip.started_at);
                    var year = tripStartDate.getFullYear().toString();
                    var month = (tripStartDate.getMonth()+1).toString();
                    var date = (tripStartDate.getDate()).toString();
                    
                    
                    var vehicleID = vehicleUrlParts[vehicleUrlParts.length-2];
                    var targetFolder = path.join(folderPath, vehicleID,year, month,date);
                    var vehiclePath = path.join(folderPath, vehicleID);
                    if (!fs.existsSync(vehiclePath)){
                        fs.mkdirSync(vehiclePath);
                    }
                    var yearPath = path.join(folderPath, vehicleID, year);
                    if (!fs.existsSync(yearPath)){
                        fs.mkdirSync(yearPath);
                    }   
                    var datePath = path.join(folderPath, vehicleID, year, month)        ;
                    if(!fs.existsSync(datePath)) {
                        fs.mkdirSync(datePath);
                    }

                    if (!fs.existsSync(targetFolder)){
                        fs.mkdirSync(targetFolder);
                    }
                    //console.log('Target folder:', targetFolder);
                    var targetPath = path.join(targetFolder, `${trip.id}.json`);
                    //console.log('path',targetPath);
                    //console.log(trip);
                    fs.writeFile(targetPath, JSON.stringify(trip), (e)=>{
                        if(e != null) {
                            console.error('error', e); 
                        }
                    });
                });
            } else {
                console.log(data);
            }
            //console.log('data',data);
            responses.push(data);
            if(!data._metadata) {
                console.log(data);
            }
            if(data._metadata.next == null) {
                //console.log('end of data');
                resolve(data);
            } else {
                var url = data._metadata.next.substring("https://api.automatic.com".length);
                AutomaticAPI(url)
                .then(onDataReturned);
            }
        };

        AutomaticAPI(url)
        .then(onDataReturned);
    });
}

/*
getUser('me')
.then(u=>{
    console.log(u);
    console.log(u.id)


})

*/
AutomaticTokenList.forEach((t)=>{
    AuthorizationToken = t;
    listVehicles()
    .then(response=>{
        
        response.results.forEach(vehicle => {
            var createdDate = new Date(vehicle.created_at);

            var targetFolder = 'vehicles';
            if (!fs.existsSync(targetFolder)){
                fs.mkdirSync(targetFolder);
            }      
            fs.writeFile(
                path.join(targetFolder,`${vehicle.id}.json`), 
                JSON.stringify(vehicle), (e)=>{})  ;
    
            console.log(vehicle.id);
            getMil(vehicle.id)
            .then((d)=> {
                fs.writeFile(
                    path.join(targetFolder,`${vehicle.id}.mil.json`), 
                    JSON.stringify(d), (e)=>{})  ;
                
            });
        });
    });
    

/*
    function startDownloading(year,month) {    
        /*
        var startDate = new Date(year, month-1, 1);
        console.log(startDate);
        var endDate ;
        //if(month == 12)
         //   endDate = new Date(year+1,0, 1)
        //else
            endDate = new Date(year, month, 1);
          //  console.log (startDate , ' - ', endDate);

          console.log(endDate);
        persistTrips('trips',startDate, endDate)
        .then(()=> {
            //month++;
            //if(month==13) {
             //   month = 1;
                ++year;
           // }
            if(year != 2020 )//|| month != 6)
                startDownloading(year,month);
        });
    }

    startDownloading(EARLIEST_YEAR,1);
/*/
function startDownloading(year,month) {    
    for(var year = EARLIEST_YEAR;year<=2020;++year) {
        for(var month=1;month<=12;++month) {
            for(day = 1;day < 28;day+=7) {
                var startDate = new Date(year, month-1, day);
                var endDate ;
                if(day < 28)
                    endDate = new Date(year, month-1, day+7)
                else if(month == 12)
                    endDate = new Date(year+1,0, 1)
                else
                    endDate = new Date(year, month+1, 1);
                persistTrips('trips',startDate, endDate);  
            }  
        }
    }
}
startDownloading(EARLIEST_YEAR,1);
})
