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

var rootAddr = "";
var inBool = true;
var importantInputs = [];
var minInputDepth = 10000000000;