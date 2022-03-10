////////Version 2 of the SpotCheck Helper App///////////////////
///////Takes in a .CSV file and generates a list of items that need to be counted
///////as dictated by the company. The list can then either be downloaded as on .xlsx file
///////which is generated here or printed directly from the browser which is taken care of
///////by the front-end.

const express = require('express');
const path = require("path");
const fileUpload = require("express-fileupload");
const fs = require('fs');
const { parse } = require('csv-parse');
const excel = require('excel4node');

const app = express();
app.use(
    fileUpload()
);

const createXLS = async data => {
    //takes in the list of all items supplied by the user and generates an xlsx file
    //returns a list of items which will be sent to the front-end

    //create the work book and set up the styling
    let workbook = new excel.Workbook();
    let worksheet = workbook.addWorksheet('Spot Check', {
        margins:{
            left:0.25,
            right:0.25,
            top:1.0,
            bottom:0.25
        }
    });
    let style = workbook.createStyle({
        border:{
            right:{
                style:"thin",
                color:"black"
            },
            left:{
                style:"thin",
                color:"black"
            },
            top:{
                style:"thin",
                color:"black"
            },
            bottom:{
                style:"thin",
                color:"black"
            }
        },
        alignment:{
            horizontal:'center'
        }
    });

    let styleHeader = workbook.createStyle({
        font:{
            bold:true
        }
    });

    let styleTitle = workbook.createStyle({
        font:{
            bold:true,
            size:20
        },
        alignment:{
            vertical:'center'
        }
    });

    let styleDescription = workbook.createStyle({
        font:{
            size:10
        },
        alignment:{
            horizontal:'left'
        }
    });

    /////generate the file/////

    //get the date
    let dateOb = new Date();
    let date = ("0" + dateOb.getDate()).slice(-2);
    let month = ("0" + (dateOb.getMonth() + 1)).slice(-2);
    let year = dateOb.getFullYear();

    //this part is creating the columns and headers and setting them to the appropriate width
    worksheet.cell(1,1,1,6,true).string(`Spot Check Inventory ${month}/${date}/${year}`).style(style).style(styleTitle);
    worksheet.cell(2,1).string("SKU").style(style).style(styleHeader);
    worksheet.cell(2,2).string("Description").style(style).style(styleHeader);
    worksheet.cell(2,3).string("Expected").style(style).style(styleHeader);
    worksheet.cell(2,4).string("Back").style(style).style(styleHeader);
    worksheet.cell(2,5).string("Front").style(style).style(styleHeader);
    worksheet.cell(2,6).string("Total").style(style).style(styleHeader);
    worksheet.column(1).setWidth(8);
    worksheet.row(1).setHeight(30);
    worksheet.column(2).setWidth(29);
    worksheet.column(3).setWidth(8.5);
    worksheet.column(4).setWidth(20);
    worksheet.column(5).setWidth(20);
    worksheet.column(6).setWidth(8);

    //we now want to add the items depending on what's asked for 
    //for a standard spot check 1-10,30-39,50-59,90-99
    //also add the items into a list which will be returned
    let outputList = []
    let dexes = [0,29,49,89];
    dexes.forEach((cur,count) => {
        for(let i = 0;i < 10;i++){
            worksheet.cell(count*10+i+3,1).string(data[cur+i]['Item']).style(style);
            worksheet.cell(count*10+i+3,2).string(data[cur+i]['Description']).style(style).style(styleDescription);
            worksheet.cell(count*10+i+3,3).string(data[cur+i]['Qty']).style(style);
            outputList.push({sku:data[cur+i]['Item'],description:data[cur+i]['Description'],qty:data[cur+i]['Qty']})
        }
    })

    //add borders to the remaining cells
    worksheet.cell(3,3,42,6).style(style);

    //write the file to the file system and return the list of items
    workbook.write('files/output.xlsx');
    return outputList
}

app.get('/',(req,res) => {
    //return the UI
    res.sendFile(path.join(__dirname,"frontend/index.html"));
})

//return our files/////////////////////////////////////////////
app.get('/styles.css',(req,res) => {
    res.sendFile(__dirname + '/frontend/styles.css');
});
app.get('/script.js',(req,res) => {
    res.sendFile(__dirname + '/frontend/script.js');
});
app.get('/print.html',(req,res) => {
    res.sendFile(__dirname + '/frontend/print.html');
});
app.get('/favicon.ico',(req,res) => {
    res.sendFile(__dirname + '/frontend/favicon.ico');
});
////////////////////////////////////////////////////////////

//a post method which takes in the csv, reads it, yada yada
app.post('/get-list/', async (req,res) => {
    //check if there is a file
    if(!req.files){
        return res.status(400).send("no file uploaded")
    }

    // if so check if it's a csv
    file = req.files.myFile;
    if(path.extname(file.name) !== '.csv'){
        return res.status(400).send('not a csv')
    }

    //if we are here the file exists and it's a csv so...
    //save the file to the uploads
    //happens async so it could(will) mess things up without the await
    await file.mv(__dirname + "/files/" + 'file.csv')
    
    //go through the csv and put it into an array
    let items = []
    fs.createReadStream(__dirname + "/files/file.csv")
        .pipe(parse({ columns: true, from_line : 3 }))
        .on("data", data => {
            items.push(data);
        })
        .on('end', async () => {
            //check to make sure the columns we want exists: item, qty, extended cost, description
            //if not return an error
            const cols = ['Item','Description','Extended Cost','Qty']
            cols.forEach(cur => {
                if(!items[0][cur]){
                    return res.status(400).send('missing columns')
                }
            })

            //at this point everything looks good, so we want to sort the data
            //in descending order based on extended cost
            items.sort((a,b) => {
                return b['Extended Cost'] - a['Extended Cost'];
            })

            //we now want to generate the .xls
            let itemsToCount = await createXLS(items)
            //send back the list of items to count
            res.status(200).json(itemsToCount)
        });
})

app.get('/download-xls/', (req,res) => {
    //return the xlsx file which was previously generated when the user asks for it
    res.sendFile(__dirname + "/files/output.xlsx");
})

//start the server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log('Server is running...'));