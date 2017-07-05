function showAll(t, list, btcAddr, folder) {
	var td = t.parentNode;
	var str = "";
	for (var i = 0; i < list.length; i += 2) {
		if (list[i + 1] == btcAddr) {
			str += "<strong>" + list[i] + "</strong><br>";
		} else {
			str += "<a href='/folders/" + folder + "/addresses/" + list[i + 1] + "'>" + list[i] + "</a><br>";
		}
	}
	td.innerHTML = str;
}

var savedHtml = "";
var container = "";

function getPath(obj, path, dict, labels, folder) {
	container = document.getElementById('report-data');
	savedHtml = container.innerHTML;
	container.innerHTML = "";
	container.innerHTML += "<div id='backgroundTimeline'><section class='timeline'><ul id='pathUL'></ul></section></div>";
	var word = "Received ";
	$('#sortButton').hide();
	$('#backToReport').show();
	var received = true;
	if (dict[path[0]].backward) {
		path.reverse();
		word = "Sent ";
		received = false;
	}
	path.forEach(function(addr) {
		var amt = dict[addr].received;
		var date = new Date(dict[addr].receivedDate);
		if (dict[addr].backward) {
			amt = -dict[addr].sent;
			date = new Date(dict[addr].sentDate);
		}
		var label = addr;
		if (labels[addr]) {
		  label = labels[addr]
		}
		document.getElementById('pathUL').innerHTML += "<li onclick=\"window.location.href='/folders/" + folder + "/addresses/" + addr + "/'\"><div><strong>" + label + "</strong><br>" + word + amt + "<br>" + date + "</div></li>";
	});
	startReport();
}

function returnToTable() {
	container.innerHTML = savedHtml;
	$('#sortButton').show();
	$('#backToReport').hide();
}

function sortTable() {
  var table, rows, switching, i, x, y,w,q, shouldSwitch;
  table = document.getElementById("explore-table");
  switching = true;

  while (switching) {
    switching = false;
    rows = table.getElementsByTagName("TR");
    for (i = 1; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[6];
      y = rows[i + 1].getElementsByTagName("TD")[6];
      q = rows[i].getElementsByTagName("TD")[0];
      w = rows[i + 1].getElementsByTagName("TD")[0]; 
      if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase() || (x.innerHTML.toLowerCase() == y.innerHTML.toLowerCase() && q.innerHTML < w.innerHTML)) {
        shouldSwitch= true;
        break;
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

function sort(num) {
  var table, rows, switching, i, x, y,w,q, shouldSwitch;
  table = document.getElementById("explore-table");
  switching = true;

  while (switching) {
    switching = false;
    rows = table.getElementsByTagName("TR");
    for (i = 1; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[num];
      y = rows[i + 1].getElementsByTagName("TD")[num];
      var bool = x.innerHTML < y.innerHTML
      if (num == 0 || num == 2) {
      	bool = Number(x.innerHTML) < Number(y.innerHTML)
      }
      if (bool) {
        shouldSwitch= true;
        break;
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

function showAdvanced(t) {
	if (t.innerHTML == 'Hide Advanced Search Settings') {
		t.innerHTML = 'Show Advanced Search Settings';
	} else {
		t.innerHTML = 'Hide Advanced Search Settings';
	}
	$('#explore').toggleClass('invisible');
}