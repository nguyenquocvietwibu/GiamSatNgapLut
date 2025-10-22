function toggleElement(containerID, displayStyle = "block") {
    const element = document.getElementById(containerID);
    if (element.style.display === "") {
        element.style.display = displayStyle;
    }
    else if (element.style.display == "none") {
        element.style.display = displayStyle;
    }
    else element.style.display = "none";
}

function displayElement(containerID, displayStyle = "block") {
    const element = document.getElementById(containerID);
    element.style.display = displayStyle;
}

function displayElementClassesExceptId(containerClass, containerID, displayStyle = "none") {
    const sameClassElements = document.getElementsByClassName(containerClass);
    for (let i = 0; i < sameClassElements.length; i++) {
        if (sameClassElements[i].id != containerID) {
            sameClassElements[i].style.display = displayStyle;
        }
    }
}

function showImage(containerID) {

}

function clearElementForm(containerID) {
    const form = document.getElementById(containerID);
    if (form) {
        form.reset(); // Reset tất cả input về giá trị mặc định
    }
}