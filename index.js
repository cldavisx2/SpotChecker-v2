////////Version 2 of the SpotChecker Helper App///////////////////
//The goal is to allow the user to upload a qty list in csv format from which the list of items
//to count will be generated. Will have the option of doing the standard 1-10,...90-99 or have it
//generate a random list of X number of items. As usual it will spit out an xls for printing

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
    //takes in the list of all items
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
    //generate the file
    let dateOb = new Date();
    let date = ("0" + dateOb.getDate()).slice(-2);
    let month = ("0" + (dateOb.getMonth() + 1)).slice(-2);
    let year = dateOb.getFullYear();
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

    //write the file to the file system and return
    workbook.write('files/output.xlsx');
    return outputList
}



app.get('/',(req,res) => {
    //return the UI
    res.sendFile(path.join(__dirname,"frontend/index.html"));
})
//Get our files/////////////////////////////////////////////
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

    file = req.files.myFile;
    //check if it's a csv
    if(path.extname(file.name) !== '.csv'){
        return res.status(400).send('not a csv')
    }

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
        items = items.slice(0,-1);
        //remove the first item because it's the column names and is undefined

        //check to make sure the columns we want exists: item, qty, extended cost, description
        //if not return an error
        const cols = ['Item','Description','Extended Cost','Qty']
        cols.forEach(cur => {
            if(!items[0][cur]){
                return res.status(400).send('missing columns')
            }
        })

        //at this point everything looks good, so we want to order the data decending based on extended cost
        items.sort((a,b) => {
            return b['Extended Cost'] - a['Extended Cost'];
        })

        //we now want to generate the .xls
        let itemsToCount = await createXLS(items)
        //res.sendFile(__dirname + '/files/output.xlsx');
        res.status(200).json(itemsToCount)
    });
})

app.get('/download-xls/', (req,res) => {
    res.sendFile(__dirname + "/files/output.xlsx");
})

const port = process.env.PORT || 5000;
app.listen(port, () => console.log('Server is running...'));