soysauce.init = function(selector) {
	var set;
	var numItems = 0;
	var ret = false;
	var addGoogleScript = false;
	
	if (!selector) {
		set = $("[data-ss-widget]:not([data-ss-id]), [data-ss-component='button'][data-ss-toggler-id]");
	}
	else {
		set = $(selector);
	}
	
	if ($(selector).attr("data-ss-id") !== undefined) return ret;
	
	numItems = set.length;
	
	set.each(function(i) {
		var type = $(this).attr("data-ss-widget");
		var widget;
		var orphan = false;
		
		$(this).attr("data-ss-id", ++soysauce.vars.idCount);
		
		if (!type && $(this).attr("data-ss-toggler-id") !== undefined) {
			type = "toggler";
			orphan = true;
		}
		
		switch (type) {
			case "toggler":
				widget = soysauce.togglers.init(this, orphan);
				break;
			case "carousel":
				widget = soysauce.carousels.init(this);
				break;
			case "lazyloader":
				widget = soysauce.lazyloader.init(this);
				break;
			case "autofill-zip":
				widget = soysauce.autofillZip.init(this);
				addGoogleScript = true;
				break;
		}

		if (widget !== undefined) {
			soysauce.widgets.push(widget);
			$(this).trigger("SSWidgetReady");
			ret = true;
		}
		
	});
	
	if (addGoogleScript && !$("script[src*='maps.google.com/maps/api']").length) {
		$("body").append("<script src='http://maps.google.com/maps/api/js?sensor=false&callback=soysauce.geocoder'></script>");
		soysauce.geocoder = (function() {
			return new google.maps.Geocoder();
		});
	}
	
	return ret;
}
