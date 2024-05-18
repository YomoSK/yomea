const mitt = require('mitt');

function quit() {
    window.close();
}

function maximize() {
    mitt.emit('maximize', {});
}

document.getElementById("searchbar").addEventListener("keydown", key => {
    if(key.code == "Enter") {
        console.log("Loading");
        document.querySelector('webview').src = key.srcElement.value; 
    }
});