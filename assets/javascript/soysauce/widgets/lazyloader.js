soysauce.lazyloader = (function() {
	var THROTTLE = 100; // milliseconds
	
	function Lazyloader(selector) {
		var options = soysauce.getOptions(selector);
		var self = this;
		
		this.widget = $(selector);
		this.items = this.widget.find("[data-ss-component='item']");
		this.threshold = parseInt(this.widget.attr("data-ss-threshold")) || 100;
		this.timeStamp = 0; // for throttling
		this.initialLoad = parseInt(this.widget.attr("data-ss-initial-load")) || 10;
		this.batchSize = parseInt(this.widget.attr("data-ss-batch-size")) || 5;
		this.autoload = false;
		this.button = this.widget.find("[data-ss-component='button']");
		
		if (options) options.forEach(function(option) {
			switch(option) {
				case "autoload":
				  self.autoload = true;
					break;
			}
		});
		
		this.processNextBatch(this.initialLoad);
		
		if (this.button.length) {
		  this.button.on("click", function() {
		    self.processNextBatch();
		  });
		}
		
		if (this.autoload) {
		  $(window).scroll(function(e) {
        update(e, self);
      });
		}
		
    function update(e, context) {
      if ((e.timeStamp - self.timeStamp) > THROTTLE) {
        var widgetPositionThreshold = context.widget.height() + context.widget.offset().top - context.threshold,
            windowPosition = $(window).scrollTop() + $(window).height();
        self.timeStamp = e.timeStamp;
        if (windowPosition > widgetPositionThreshold) {
          self.processNextBatch();
        }
      }
    }
	};
	
	Lazyloader.prototype.processNextBatch = function(batchSize) {
	  var batchSize = batchSize || this.batchSize,
	      $items = $(this.items.splice(0, batchSize)),
	      self = this,
	      count = 0;
	      
    self.widget.trigger("SSBatchStart");

    $items.each(function(i, item) {
      var $item = $(item);
      $item.find("[data-ss-ll-src]").each(function() {
        soysauce.lateload(this);
      });
      $item.imagesLoaded(function(e) {
        $item.attr("data-ss-state", "loaded");
        if (++count === $items.length) {
          self.widget.trigger("SSBatchLoaded");
          if (!self.items.length) {
            self.widget.trigger("SSItemsEmpty");
          }
        }
      });
    });
	};
	
	Lazyloader.prototype.reload = function() {
	  this.items = this.widget.find("[data-ss-component='item']:not([data-ss-state])");
	  this.processNextBatch();
	};
	
	return {
		init: function(selector) {
			return new Lazyloader(selector);
		}
	};
	
})();
