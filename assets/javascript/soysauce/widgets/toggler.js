soysauce.togglers = (function() {
  var TRANSITION_END = "transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd";
  
  // Togglers
  function Toggler(selector, orphan) {
    var self = this;
    var options = soysauce.getOptions(selector);

    // Base
    if (orphan) {
      var button = $(selector);
      var togglerID = button.attr("data-ss-toggler-id");
      var query = "[data-ss-toggler-id='" + togglerID + "']";
      var tabGroupName = "";
      
      this.orphan = true;
      this.widget = $(query);
      
      this.widget.each(function(i, component) {
        var type = $(component).attr("data-ss-component");
        switch (type) {
          case "button":
            self.button = $(component);
            break;
          case "content":
            self.content = $(component);
            break;
        }
      });
      
      if (!this.content) {
        console.warn("Soysauce: No content found for toggler-id '" + togglerID + "'. Toggler may not work.");
        return;
      }
      
      this.button.click(function(e) {
        self.toggle(null, e);
      });
      
      tabGroupName = button.attr("data-ss-tab-group");
      
      this.orphanTabGroup = $("[data-ss-tab-group='" + tabGroupName  + "']");
      this.orphanTabs = (this.orphanTabGroup.length > 1) ? true : false;
      
      this.setState("closed");
      this.content.attr("data-ss-id", button.attr("data-ss-id"));
      
      this.button.append("<span class='icon'></span>");
      this.content.wrapInner("<div data-ss-component='wrapper'/>");
    }
    else {
      this.widget = $(selector);
      this.orphan = false;
      this.allButtons = this.widget.find("> [data-ss-component='button']");
      this.button = this.allButtons.first();
      this.allContent = this.widget.find("> [data-ss-component='content']");
      this.content = this.allContent.first();
    }
    
    this.parentID = 0;
    this.state = "closed";
    this.isChildToggler = false;
    this.hasTogglers = false;
    this.parent = undefined;
    this.ready = true;
    this.adjustFlag = false;
    this.freeze = false;
    this.opened = false;
    
    // Slide
    this.slide = false;
    this.height = 0;
    this.prevChildHeight = 0;
    
    // Ajax
    this.ajax = false;
    this.ajaxData;
    this.ajaxing = false;
    this.ajaxOnLoad = false;
    
    // Tab
    this.tab = false;
    this.childTabOpen = false;
    this.nocollapse = false;
    
    // Responsive
    this.responsive = false;
    this.responsiveVars = {
      threshold: parseInt(this.widget.attr("data-ss-responsive-threshold"), 10) || 768,
      accordions: true
    };
    
    if (options) options.forEach(function(option) {
      switch(option) {
        case "ajax":
          self.ajax = true;
          self.ajaxOnLoad = /true/.test(self.widget.attr("data-ss-ajax-onload"));
          break;
        case "tabs":
          self.tab = true;
          break;
        case "nocollapse":
          self.nocollapse = true;
          break;
        case "slide":
          self.slide = (soysauce.vars.degrade) ? false : true;
          break;
        case "responsive":
          self.responsive = true;
          self.tab = true;
          break;
      }
    });

    if (this.orphan) {
      this.content.on(TRANSITION_END, function() {
        self.content.trigger("slideEnd");
        self.ready = true;
      });
      return this;
    }

    this.allButtons.append("<span class='icon'></span>");
    this.allContent.wrapInner("<div data-ss-component='wrapper'/>");

    this.hasTogglers = (this.widget.has("[data-ss-widget='toggler']").length > 0) ? true : false; 
    this.isChildToggler = (this.widget.parents("[data-ss-widget='toggler']").length > 0) ? true : false;

    if (this.isChildToggler) {
      var parent = this.widget.parents("[data-ss-widget='toggler']");
      this.parentID = parseInt(parent.attr("data-ss-id"), 10);
      this.parent = soysauce.fetch(this.parentID);
    }

    if (this.widget.attr("data-ss-state") !== undefined && this.widget.attr("data-ss-state") === "open") {
      this.allButtons.each(function() {
        var button = $(this);
        if (!button.attr("data-ss-state"))  {
          button.attr("data-ss-state", "closed");
          button.find("+ [data-ss-component='content']").attr("data-ss-state", "closed");
        }
        else if (button.attr("data-ss-state") === "open") {
          this.button = button;
          this.content = button.find("+ [data-ss-component='content']");
        }
      });
      this.opened = true;
    }
    else {
      this.allButtons.attr("data-ss-state", "closed");
      this.allContent.attr("data-ss-state", "closed");
      this.widget.attr("data-ss-state", "closed");
      this.opened = false;
    }
    
    if (this.slide) {
      this.widget.find("> [data-ss-component='content'][data-ss-state='open']").attr("data-ss-open-onload", "true");
      this.allContent.attr("data-ss-state", "open");

      this.allContent.each(function() {
        var content = $(this);
        content.imagesLoaded(function() {
          var height;
          if (self.hasTogglers) {
            content.find("[data-ss-component='content']").attr("data-ss-state", "closed");
          }
          height = content.outerHeight(true);
          content.attr("data-ss-slide-height", height);
          if (!content.attr("data-ss-open-onload")) {
            content.css("height", "0px");
            content.attr("data-ss-state", "closed");
          }
          else {
            self.height = height;
            content.css("height", self.height);
          }
          if (self.hasTogglers) {
            content.find("[data-ss-component='content']").removeAttr("data-ss-state");
          }
        });
      });

      this.allContent.on(TRANSITION_END, function() {
        if (!self.orphan) {
          self.widget.trigger("slideEnd");
        }
        self.ready = true;
      });
    }
    
    this.allButtons.click(function(e) {
      self.toggle(null, e);
    });
    
    if (this.responsive) {
      this.handleResponsive();
    }
    
    if (this.ajax) {
      var obj = this.widget;
      var content = this.widget.find("> [data-ss-component='content'][data-ss-ajax-url]");
      var ajaxButton;
      var url = "";
      var callback;
      var self = this;
      var firstTime = false;
      
      if (content.length === 0) {
        console.warn("Soysauce: 'data-ss-ajax-url' tag required on content. Must be on the same domain if site doesn't support CORS.");
        return;
      }
      
      content.each(function(i, contentItem) {
        ajaxButton = $(contentItem.previousElementSibling);
        if (self.ajaxOnLoad) {
          obj.on("SSWidgetReady", function() {
            injectAjaxContent(self, contentItem);
          });
        }
        else {
          ajaxButton.click(function() {
            injectAjaxContent(self, contentItem);
          });
        }
      });
      
      function injectAjaxContent(self, contentItem) {
        url = $(contentItem).attr("data-ss-ajax-url");
        
        self.setState("ajaxing");
        self.ready = false;
        self.ajaxing = true;
        
        self.ajaxData = soysauce.ajax(url);
        
        self.setAjaxComplete();
      }
    }
    
    if (this.tab && this.nocollapse) {
      this.content.imagesLoaded(function() {
        self.widget.css("min-height", self.button.outerHeight(true) + self.content.outerHeight(true));
      });
    }
  } // End constructor
  
  Toggler.prototype.open = function() {
    var slideOpenWithTab = this.responsiveVars.accordions;

    if (!this.ready && !slideOpenWithTab) return;

    var self = this;
    var prevHeight = 0;

    if (this.slide) {
      if (this.responsive && !slideOpenWithTab) return;

      this.ready = false;

      if (this.adjustFlag || slideOpenWithTab) this.content.one(TRANSITION_END, function() {
        self.adjustHeight();
      });

      if (this.isChildToggler && this.parent.slide) {
        if (this.tab) {
          this.parent.setHeight(this.parent.height + this.height - this.parent.prevChildHeight);
        }
        else {
          this.parent.addHeight(this.height);
        }
        this.parent.prevChildHeight = this.height;
      }

      if (this.ajax && this.height === 0) {
        $(this.content).imagesLoaded(function() {
          self.content.css("height", "auto");
          self.height = self.content.outerHeight(true);
          self.content.css("height", self.height + "px");
        });
      }
      else {
        self.height = parseInt(self.content.attr("data-ss-slide-height"), 10);
        self.content.css("height", self.height + "px");
      }
    }
    
    if (this.tab && this.nocollapse) {
      this.widget.css("min-height", this.button.outerHeight(true) + this.content.outerHeight(true));
    }

    this.opened = true;
    this.setState("open");
  };
  
  Toggler.prototype.close = function(collapse) {
    var self = this;

    if (!this.ready) return;

    if (this.slide) {
      this.ready = false;
      if (this.isChildToggler && this.parent.slide && collapse) {
        this.parent.addHeight(-this.height);
      }
      this.content.css("height", "0px");
    }

    this.setState("closed");
  };
  
  Toggler.prototype.doResize = function() {
    this.adjustFlag = true;
    if (this.opened) {
      this.adjustHeight();
    }
    if (this.responsive) {
      this.handleResponsive();
    }
  };
  
  Toggler.prototype.handleResize = function() {
    var self = this;
    
    if (this.defer) {
      var subWidgets = this.allContent.find("[data-ss-widget]");
      
      this.allContent.css({
        "clear": "both",
        "position": "relative"
      });

      if (!subWidgets.length) {
        this.doResize();
      }
      else {
        subWidgets.each(function(i, e) {
          var widget = soysauce.fetch(e).widget;

          if ((i + 1) !== subWidgets.length) return;
            
          widget.one("SSWidgetResized", function () {
            self.allContent.css({
              "clear": "",
              "position": "",
              "display": ""
            });
            self.doResize();
          });
        });
      }
    }
    else {
      this.doResize();  
    }
  };
  
  Toggler.prototype.adjustHeight = function() {
    if (!this.slide) {
      if (this.tab && this.nocollapse) {
        this.widget.css("min-height", this.button.outerHeight(true) + this.content.outerHeight(true));
      }
      return;
    }
    if (this.opened) {
      this.height = this.content.find("> [data-ss-component='wrapper']").outerHeight(true);
      this.content.attr("data-ss-slide-height", this.height).height(this.height);
    }
  };

  Toggler.prototype.addHeight = function(height) {
    this.height += height;
    this.height = (this.height < 0) ? 0 : this.height;
    if (this.slide) {
      this.content.attr("data-ss-slide-height", this.height);
    }
    this.content.css("height", this.height + "px");
  };

  Toggler.prototype.setHeight = function(height) {
    this.height = height;
    this.height = (this.height < 0) ? 0 : this.height;
    if (this.slide) {
      this.content.attr("data-ss-slide-height", this.height);
    }
    this.content.css("height", this.height + "px");
  };

  Toggler.prototype.toggle = function(component, e) {
    var self = this;
    var target;
    
    if (this.freeze || this.ajaxing) return;

    if (e) {
      target = e.target;
    }
    else {
      if (component && !this.orphan) {
        if (typeof(component) === "string") {
          target = component = this.widget.find(component)[0];
        }
        try {
          if (/content/.test(component.attributes["data-ss-component"].value)) {
            var $component = this.widget.find(component);
            target = component.previousElementSibling;
          }
        }
        catch (e) {
          console.warn("Soysauce: component passed is not a Soysauce component. Opening first toggler.");
          target = this.button[0];
        }
      }
      else {
        target = this.button[0];
        if (target && !target.attributes["data-ss-component"]) {
          console.warn("Soysauce: component passed is not a Soysauce component. Opening first toggler.");
        }
      }
    }

    if (!$(target).attr("data-ss-component")) {
      target = $(target).closest("[data-ss-component='button']")[0];
    }

    if (this.orphan) {
      if (this.opened) {
        this.opened = false;
        this.setState("closed");
      }
      else {
        if (this.orphanTabs) {
          this.orphanTabGroup.each(function() {
            var tab = soysauce.fetch(this);
            if (tab.opened) {
              tab.toggle();
            }
          }); 
        }
        this.opened = true;
        this.setState("open");
      }
      return;
    }

    if (this.tab) {
      var collapse = (this.button.attr("data-ss-state") === "open" &&
                      this.button[0] === target) ? true : false;

      if ((this.responsive && !this.responsiveVars.accordions || this.nocollapse) && (this.button[0] === target)) return;

      if (this.isChildToggler && this.tab) {
        this.parent.childTabOpen = !collapse;
        if (collapse) {
          this.parent.prevChildHeight = 0;
        }
      }

      this.close(collapse);

      this.button = $(target);
      this.content = $(target).find("+ [data-ss-component='content']");

      if (this.slide) {
        self.height = parseInt(self.content.attr("data-ss-slide-height"), 10);
      }

      if (collapse) {
        this.widget.attr("data-ss-state", "closed");
        this.opened = false;
        return;
      }

      this.open();
    }
    else {
      this.button = $(target);
      this.content = $(target).find("+ [data-ss-component='content']");

      var collapse = (this.button.attr("data-ss-state") === "open" &&
                      this.widget.find("[data-ss-component='button'][data-ss-state='open']").length === 1) ? true : false;
      
      if (collapse) {
        this.opened = false;
      }
      
      (this.button.attr("data-ss-state") === "closed") ? this.open() : this.close();
    }
  };

  Toggler.prototype.setState = function(state) {
    this.state = state;
    this.button.attr("data-ss-state", state);
    this.content.attr("data-ss-state", state);

    if (this.orphan) return;
    
    if (this.opened) {
      this.widget.attr("data-ss-state", "open");
    }
    else {
      this.widget.attr("data-ss-state", "closed");
    }

    if (this.responsive && this.opened) {
      this.handleResponsive();
    }
  };

  Toggler.prototype.setAjaxComplete = function() {
    this.ajaxing = false;
    this.ready = true;
    if (this.opened) {
      this.setState("open");
    }
    else {
      this.setState("closed");
    }
    this.widget.trigger("SSAjaxComplete");
  };

  Toggler.prototype.handleFreeze = function() {
    this.freeze = true;
  };

  Toggler.prototype.handleUnfreeze = function() {
    this.freeze = false;
  };

  Toggler.prototype.handleResponsive = function() {
    if (!this.responsive) return;
    if (window.innerWidth >= this.responsiveVars.threshold) {
      this.responsiveVars.accordions = false;
      this.widget.attr("data-ss-responsive-type", "tabs");
      if (!this.opened) {
        this.button = this.widget.find("[data-ss-component='button']").first();
        this.content = this.widget.find("[data-ss-component='content']").first();
        this.open();
      }
      this.widget.css("min-height", this.button.outerHeight(true) + this.content.outerHeight(true) + "px");
    }
    else {
      this.responsiveVars.accordions = true;
      this.widget.attr("data-ss-responsive-type", "accordions");
      this.widget.css("min-height", "0");
    }
  };
  
  return {
    init: function(selector, orphan) {
      return new Toggler(selector, orphan);
    }
  };
  
})();
