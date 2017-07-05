function selectFolder(folder) {
    console.log(folder);
    console.log(folder['name']);
    $('#folderTitle').html(folder['name']);
    $('#folderData').html('')
}