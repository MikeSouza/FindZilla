/*
 *  Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {
  /*
   * Public Constructors
   */
  FindZilla.OptionsPage = function() {
    var hotkeyConfigurers = {};

    function handleOptionChange(obj) {
      var value;

      console.log(obj.target);

      switch (obj.target.type) {
        case 'checkbox':
          value = $(obj.target).is(':checked');
          break;
        case 'text':
          value = $(obj.target).val();
          break;
        default:
          return;
      }

      console.log(value);

      var optionInfo = getOptionInfo($(obj.target));

      if (optionInfo) {
        optionsManager.setOption(value, optionInfo.section, optionInfo.key);
        notifyTabs({
          option : optionInfo,
          value : value
        });
      }
    }

    function getHotkeyConfigurer(textInput) {
      var hkConfigurer = hotkeyConfigurers[textInput.id];

      if (!hkConfigurer) {
        hkConfigurer = new FindZilla.HotkeyConfigurer($(textInput));
        hotkeyConfigurers[textInput.id] = hkConfigurer;
      }

      return hkConfigurer;
    }

    function toggleEnabled(element, isInit) {
      var elementId = element.id;
      var array = elementId.split('-');

      if (array && array.last() === 'enable') {
        array.pop();

        var idPrefix = array.join('-');

        var textInput = $("input[id|='" + idPrefix + "'][type='text']");

        var hkConfigurer = getHotkeyConfigurer(textInput);

        if ($(element).is(':checked')) {
          textInput.prop('disabled', false);

          hkConfigurer.start(!isInit);
        } else {
          textInput.prop('disabled', true);

          hkConfigurer.stop();

          // Retrieve the default hotkey value
          var optionInfo = getOptionInfo(textInput);
          var defaultValue = optionsManager.getDefault(optionInfo.section, optionInfo.key);

          textInput.val(defaultValue);

          // Raise a changed event, notifying all tabs to use the default hotkey value
          textInput.change();
        }
      }
    }

    function toCamelCase(array) {
      if (!array)
        return null;

      for (var i = 1; i < array.length; i++) {
        array[i] = array[i].substr(0, 1).toUpperCase() + (array[i].length > 1 ? array[i].substr(1).toLowerCase() : '');
      }

      return array.join('');
    }

    function getOptionInfo(target) {
      var className;
      var idName;
      var classes = target.attr('class').split(/\s+/);

      for (var i = 0; i < classes.length; i++) {
        var array = classes[i].split('-');
        if (array.length > 1 && array.last() === "option") {
          array.pop();

          className = toCamelCase(array);

          var array = target.attr('id').split('-');
          if (array.length > 1) {
            array.shift();

            idName = toCamelCase(array);

            return {
              section : className,
              key : idName
            };
          }
        }
      }
    }

    function populateOption(inputObj, value) {
      switch (inputObj.type) {
        case 'checkbox':
          $(inputObj).prop('checked', value);
          break;
        case 'text':
          $(inputObj).val(value);
          break;
        default:
          break;
      }
    }

    function notifyTabs(option) {
      chrome.tabs.query({
        status : 'complete'
      }, function(allTabs) {
        $.each(allTabs, function(index, tab) {
          if (!tab.url.isChromeUrl()) {
            chrome.tabs.sendMessage(tab.id, new FindZilla.Message(FindZilla.MessageType.OPTION, option));
          }
        });
      });
    }

    function initOption() {
      var element = $(this);

      var optionInfo = getOptionInfo(element);
      var value = optionsManager.getOption(optionInfo.section, optionInfo.key);

      if (value) {
        populateOption(this, value);
      }

      element.change(handleOptionChange);
    }

    function initEnabledOption() {
      $(this).change(function(e) {
        toggleEnabled(e.target, false);
      });

      // Toggle the enabled state in accordance with the loaded option value
      toggleEnabled(this, true);
    }

    function i18n() {
      $("title, h1, th, label").each(function(index) {
        var element = $(this);
        var i18nMessage = chrome.i18n.getMessage(element.text());

        if (!i18nMessage.isBlank()) {
          element.text(i18nMessage);
        }
      });
    }

    function init() {
      i18n();

      // Load options and register listener for saving changes
      $("input[type='checkbox'][id|='fz'], input[type='text'][id|='fz']").each(initOption);

      // Register listeners for enabling/ disabling input elements
      $("input[id|='fz'][id$='enable']").each(initEnabledOption);
    }

    return {
      init : init
    };
  };

  var backgroundPage = chrome.extension.getBackgroundPage();
  var optionsManager = backgroundPage.optionsManager;

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});

var optionsPage = new FindZilla.OptionsPage();

optionsPage.init();