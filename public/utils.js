function showAll(t, list, btcAddr) {
	var td = t.parentNode;
	var str = "";
	for (var i = 0; i < list.length; i += 2) {
		if (list[i + 1] == btcAddr) {
			str += "<strong>" + list[i] + "</strong><br>";
		} else {
			str += "<a href='/addresses/" + list[i + 1] + "'>" + list[i] + "</a><br>";
		}
	}
	td.innerHTML = str;
}