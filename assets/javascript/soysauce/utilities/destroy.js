(function(window, $, soysauce, undefined) {
  soysauce.destroy = function(selector, removeWidget) {

    try {
      var widget = soysauce.fetch(selector);
      var $widget = widget.widget;

      $widget.find("[data-ss-widget][data-ss-id]").each(function() {
        soysauce.destroy(this);
      });

      $widget.off("*");
      $widget.hammer().off("*");
      $widget.empty();
      $widget.off();
      $widget.hammer().off();

      if (removeWidget) {
        $widget.remove();
      }

      delete soysauce.widgets[widget.id - 1];

      return true;
    } catch (e) {
      console.warn("Soysauce: could not destroy widget with id '" + widget.id + "'. Possible memory leaks. Message: " + e.message);
    }

    return false;
  }
})(window, jQuery, soysauce);
