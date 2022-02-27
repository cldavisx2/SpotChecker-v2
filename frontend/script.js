const clearInitialScreen = () => {
    //fade out the instructions one by one
    let structs = [...document.getElementById('upload-instructions').children];
    structs.forEach((cur, count) => {
        setTimeout(() => {
            cur.classList.add("fade-out");
        },count*200)

    });

    //fade out the buttons
    setTimeout(() => {
        document.getElementById("upload-buttons").classList.add("fade-out");
    },800)

    //fade out the file name
    setTimeout(() => {
        document.getElementById('file-name').classList.add("fade-out")
    },1000)

    //remove initial view from the DOM
    setTimeout(() => {
        document.getElementById('upload-screen').remove();
    },2000)
}

//update the display to show the items to be counted
const displayItems = items => {
    //clear the screen
    clearInitialScreen();

    //add the title and date to the printable document
    const d = new Date();
    let myDate = `${d.getMonth()+1}/${d.getDate()+1}/${d.getFullYear()}`
    let ifrm = document.getElementById('ifrm');
    let printDoc = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
    printDoc.getElementById('print-table').insertAdjacentHTML('beforebegin',`<h1>Spot Check Inventory ${myDate}</h1>`)

    //put in the new stuff once everything is cleared
    //fade in each item individually
    setTimeout(() =>{
        document.getElementById('content-container-container').insertAdjacentHTML('beforeend','<div id = "item-head"><p>Item Description</p><p id = "sku-head">Sku</p></div>');
        setTimeout(() => {
            document.getElementById('item-head').classList.add("item-head-open");
        },50)
        items.forEach((cur,count) => {
            setTimeout(() => {
                //add the displayed item cards
                document.getElementById('content-container')
                .insertAdjacentHTML('beforeend',`<div class = "item-card" id = "item-card-${count}">
                                                      <p class = "item-description">${cur.description}</p>
                                                      <p class = "item-sku">${cur.sku}</p>
                                                 </div>`);
                //set the style so it fades in
                setTimeout(() => {
                    document.getElementById(`item-card-${count}`).classList.add("open-card");
                },50)

                
                //update the scroll bar
                calcScrollBar();
            },100*count)
            //add the item into the printable table
            //we don't want to delay for this
            printDoc.getElementById('print-table')
                    .insertAdjacentHTML('beforeend',`<tr>
                                                        <td>${cur.sku}</td>
                                                        <td class = "description-cell">${cur.description}</td>
                                                        <td>${cur.qty}</td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                    </tr>`)
        })
    },2000)

    //add in the download and print button
    setTimeout(() => {
        document.getElementsByTagName('BODY')[0]
                .insertAdjacentHTML('beforeend','<div id = "dlp-buttons-container"></div>')

        //DONWLOAD
        document.getElementById('dlp-buttons-container')
                .insertAdjacentHTML('beforeend', `<div id = 'download-button' class = 'dlp-button'>
                                                       <p id = "download-text">Download XLS</p>
                                                       <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                                                  </div>`);
        document.getElementById('download-button').addEventListener('click',getXLS);
        
        //PRINT
        document.getElementById('dlp-buttons-container')
        .insertAdjacentHTML('beforeend',`<div id = 'print-button' class = 'dlp-button'>
                                            <p id = "print-text">Print</p>
                                            <div class="lds-ellipsis" id = "lds-ellipsis-p"><div></div><div></div><div></div><div></div></div>
                                        </div>`);
        document.getElementById('print-button').addEventListener('click', print);

        //fade in the dl & print button
        setTimeout(() => {
            document.getElementById('download-button').style.opacity = "1";
            document.getElementById('print-button').style.opacity = "1";
        },50)
                                                    

    },3700)
}

//launch an error message if something is wrong with the file
const launchError = msg => {
    let errorMSG = document.getElementById('file-name');
    //set the message and change it's color to red
    errorMSG.innerHTML = msg;
    errorMSG.style.color = "red";
    //turn off the spinner
    document.getElementById('upload-text').style.opacity = "1";
    document.querySelector('.lds-ellipsis').style.opacity = "0";
}

//update the displayed file-name
document.getElementById('file-selector').addEventListener('change', e => {
    document.getElementById('file-name').innerHTML = 'File Selected: ' + e.target.files[0].name;
    document.getElementById('file-name').style.color = "orange";
})

//when we click on the upload button send our file to the server, it will either send an error message describing
//whats wrong or return a list of items
document.getElementById('upload-button').addEventListener('click',() => {
    //add a spinner into the upload button here
    document.getElementById('upload-text').style.opacity = "0";
    document.querySelector('.lds-ellipsis').style.opacity = "1";
    document.getElementById('file-name').innerHTML = 'Working on it...';
    //make the request
    let file = document.getElementById('file-selector').files[0];
    const formData = new FormData();
    formData.append('myFile',file);
    fetch('/get-list',{
        method: 'POST',
        body: formData,
    }).then(response => {
        //if there was an error return an error message, otherwise return the items to count
            if(response.status === 200){
                return response.json()
            }
            else{
                return response.text()
                       .then(data => [{msg:data}])
            }
        })
      .then(data => {
          if(data[0].msg){
              switch(data[0].msg) {
                    case 'no file uploaded':
                        launchError("No File Was Selected...");
                        break;
                    case 'not a csv':
                        launchError("The Selected File Is Not In CSV Format...")
                        break;
                    case 'missing columns':
                        launchError("The Selected File Does Not Contain The Required Data...")
                        break;
                    default:
                        launchError("An Unknown Error Has Occurred...")
                        break;
                }
            } 
            else{
                //if we are here we have successfully returned at list of items to count
                //the items are in an array of objects {sku:sku,description:description}
                //at this point we will change the display to show a list of the items

                //wait an artificial second
                setTimeout(() => displayItems(data),2000);
                // displayItems(data);
            }  
    })
})

getXLS = () => {
    //display the spinner
    document.getElementById('download-text').style.opacity = '0';
    document.querySelector('.lds-ellipsis').style.opacity = '1';
    fetch('/download-xls').then(response => response.blob())
                          .then(blob => {
                                //wait a fake sec then download the thing
                                setTimeout(() => {
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Item List';
                                    a.click();
                                    //take away the spinner
                                    document.getElementById('download-text').style.opacity = '1';
                                    document.querySelector('.lds-ellipsis').style.opacity = '0';
                                },900);
                          })
}


print = () => {
    //display the spinner
    document.getElementById('print-text').style.opacity = '0';
    document.getElementById('lds-ellipsis-p').style.opacity = '1';
    setTimeout(() => {
        document.getElementById('print-text').style.opacity = '1';
        document.getElementById('lds-ellipsis-p').style.opacity = '0';
        let ifrm = document.getElementById('ifrm');
        let printDoc = ifrm.contentWindow;
        printDoc.focus();
        printDoc.print();
    },900)
}



////scroll bar stuff
const scrollBar = document.getElementById('scroll-bar');
const container = document.getElementById('content-container');
document.getElementById('content-container').addEventListener('scroll', () => {
    calcScrollBar();
});


const calcScrollBar = () => {
    let arrowSize = 5;
    //height
    let barHeight = parseInt(container.offsetHeight*(container.offsetHeight/container.scrollHeight)-2*arrowSize-8);
    scrollBar.style.height = `${barHeight}px`;
    //position
    //we don't need the yOffset top anymore simply because we made the content-container-container position relative
    // let yOffset = document.getElementById('content-container').getBoundingClientRect().top;
    let yOffset = 0;
    let scrollTop = container.scrollTop*(container.offsetHeight/container.scrollHeight) + yOffset + arrowSize + 5;
    scrollBar.style.top = `${scrollTop}px`
    //dont show it if you dont' need to
    if(container.scrollHeight - container.offsetHeight <= 1){
        scrollBar.parentNode.style.opacity = '0';
    }
    else{
        scrollBar.parentNode.style.opacity = '1';
    }
}

//scrollbar buttons
let scrollInterval
//UP
document.querySelector(".fa-caret-up").addEventListener('mousedown',() => {
    scrollInterval = setInterval(() => {
        let x = container.scrollTop;
        let newTop = x - 2;
        container.scrollTop = newTop;
    },10)
})

document.querySelector(".fa-caret-up").addEventListener('mouseup',() => {
    clearInterval(scrollInterval);
})
document.querySelector(".fa-caret-up").addEventListener('mouseleave',() => {
    clearInterval(scrollInterval);
})

//DOWN
document.querySelector(".fa-caret-down").addEventListener('mousedown',() => {
    scrollInterval = setInterval(() => {
        let x = container.scrollTop;
        let newTop = x + 2;
        container.scrollTop = newTop;
    },10)
})

document.querySelector(".fa-caret-down").addEventListener('mouseup',() => {
    clearInterval(scrollInterval);
})
document.querySelector(".fa-caret-down").addEventListener('mouseleave',() => {
    clearInterval(scrollInterval);
})

//drag and scroll
let dragScroll = false;
let oldY;
scrollBar.addEventListener('mousedown',() => {dragScroll = true});
document.querySelector('body').addEventListener('mouseup', () => {dragScroll = false})
document.addEventListener('mousemove', e => {
    if(dragScroll){
        let x = container.scrollTop;
        let newTop = x + (e.clientY-oldY)*2;
        container.scrollTop = newTop;
    }
    oldY = e.clientY;
})


