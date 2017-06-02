$(function() {

    $('#transaction-view-link').click(function(e) {
		$("#transaction-view").delay(100).fadeIn(100);
 		$("#graph-view").fadeOut(100);
 		$('#note-view').fadeOut(100);
		$('#graph-view-link').removeClass('active');
		$('#note-view-link').removeClass('active');
		$(this).addClass('active');
		e.preventDefault();
	});
	$('#graph-view-link').click(function(e) {
		$("#graph-view").delay(100).fadeIn(100);
 		$("#transaction-view").fadeOut(100);
 		$("#note-view").fadeOut(100);
		$('#transaction-view-link').removeClass('active');
		$('#note-view-link').removeClass('active');
		$(this).addClass('active');
		e.preventDefault();
	});
	$('#note-view-link').click(function(e) {
		$("#note-view").delay(100).fadeIn(100);
 		$("#transaction-view").fadeOut(100);
 		$("#graph-view").fadeOut(100);
		$('#transaction-view-link').removeClass('active');
		$('#graph-view-link').removeClass('active');
		$(this).addClass('active');
		e.preventDefault();
	});

});

function goToReport(address, tx_index) {
	window.location.href='/address/' + address + '/report/' + tx_index;
}

var rootAddr = "";
var inBool = true;
var importantInputs = [];
var minInputDepth = 10000000000;

// function explore(r, tx_index, root) {
// 	rootAddr = root;
// 	console.log(tx_index);
// 	var num = r.parentNode.parentNode.rowIndex;
// 	var table = document.getElementById('transaction-table');
// 	var row = table.insertRow(num + 1);
// 	for (var i = 0; i < 6; i++) {
// 		var cell = row.insertCell(0);
// 		cell.innerHTML = "";
// 		if (i == 5)
// 			cell.innerHTML = "<strong>Nodes of Interest</strong>";
// 		else if (i == 4)
// 			cell.innerHTML = "<strong>From Inputs</strong>"
// 		else if (i == 3)
// 			cell.innerHTML = "<strong>From Outputs</strong>"
// 	}
// }

// function inspectInputs(addr, num, path) {
//     var url = 'https://blockchain.info/address/' + addr + '?format=json&cors=true';
//     var p = path;
//     $.getJSON(url, function(data){
//         if (data.n_tx < 3 && inBool) {
//             data.txs[1].inputs.forEach(function(input) {
//                 p.push(input.prev_out.addr);
//                 inspectInputs(input.prev_out.addr, num + 1, p);
//             });
//         } else if (importantInputs.indexOf(addr) == -1 && num <= minInputDepth && addr != rootAddr) {
//             importantInputs.push(addr);
//             minInputDepth = num;
//             inBool = false;
//             console.log(importantInputs);
//         } else {
//             if (importantInputs.length == 0) {
//                 importantInputs.push("None");
//             }
//             inBool = false;
//         }   
//     });
// }