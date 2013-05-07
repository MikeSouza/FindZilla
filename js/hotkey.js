/*
 *  Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {
  /**
   * An object for configuring a hotkey keyboard shortcut.
   * @constructor
   */
  FindZilla.HotkeyConfigurer = function(textInput) {
    /*
     * Private Constants
     */
    var Indicator = Object.freeze({
      FOCUS : 'input-focus',
      GOOD : 'input-good',
      BAD : 'input-bad'
    });

    /*
     * Private Members
     */
    var detectTimeoutId = null;
    var resetTimeoutId = null;
    var flashTimeoutId = null;

    var defaultKeyCode = "F".charCodeAt();
    var lastKeyCode = null;
    var keyCode;

    /*
     * Private Methods
     */
    function flashGoodIndicator() {
      textInput.removeClass(Indicator.BAD);

      showGoodIndicator();

      if (flashTimeoutId != null)
        clearTimeout(flashTimeoutId);

      flashTimeoutId = setTimeout(function() {
        textInput.removeClass(Indicator.GOOD);

        showFocusIndicator();
      }, 1e3);
    }

    function onMessage(request, sender, sendResponse) {
      if (!textInput.is(':focus'))
        return;

      console.log("Message from: " + sender.tab.url + "(" + request.type + ")");

      switch (request.type) {
        case FindZilla.MessageType.COMMAND:
          var command = request.data;

          simulateHotkey(command.shortcut.split('+'));
          break;
        default:
          break;
      }
    }

    function simulateHotkey(keys) {
      var key = keys.last().charCodeAt();

      textInput.trigger($.Event("keydown", {
        keyCode : key
      }));
      textInput.trigger($.Event("keyup", {
        keyCode : key
      }));
    }

    function revertHotkey() {
      if (resetTimeoutId != null)
        clearTimeout(resetTimeoutId);

      resetTimeoutId = setTimeout(function() {
        // Revert to the previous valid key code if it exists, otherwise revert to the default
        if (lastKeyCode) {
          keyCode = lastKeyCode;
          lastKeyCode = null;
        } else {
          reset();
        }

        textInput.val(String.fromCharCode(keyCode));

        flashGoodIndicator();
      }, 2e3);
    }

    function detectHotkeyConflict() {
      if (detectTimeoutId != null)
        clearTimeout(detectTimeoutId);

      detectTimeoutId = setTimeout(function() {
        // If the textbox still has focus then the hotkey is probably OK to use.
        // Otherwise it likely conflicts with a built-in Chrome hotkey or another extension hotkey.
        if (textInput.is(':focus')) {
          textInput.removeClass(Indicator.BAD);

          showFocusIndicator();

          lastKeyCode = keyCode;
        } else {
          textInput.removeClass(Indicator.FOCUS);

          showBadIndicator();

          revertHotkey();
        }
      }, 250);
    }

    function showGoodIndicator() {
      if (!textInput.hasClass(Indicator.GOOD))
        textInput.addClass(Indicator.GOOD);
    }

    function showBadIndicator() {
      if (!textInput.hasClass(Indicator.BAD))
        textInput.addClass(Indicator.BAD);
    }

    function showFocusIndicator() {
      if (!textInput.hasClass(Indicator.FOCUS))
        textInput.addClass(Indicator.FOCUS);
    }

    function removeIndicators() {
      textInput.removeClass(Indicator.GOOD);
      textInput.removeClass(Indicator.BAD);
      textInput.removeClass(Indicator.FOCUS);
    }

    function isAlphaNumeric(keyCode) {
      return keyCode && keyCode >= 48 && keyCode <= 90;
    }

    function processKeyDown(e) {
      if (!isAlphaNumeric(e.keyCode))
        return;

      keyCode = e.keyCode;

      textInput.val(String.fromCharCode(keyCode));

      detectHotkeyConflict();
    }

    function processKeyUp(e) {
      // Ensure that key code is the same as the key code validated and stored upon keydown
      if (e.keyCode == keyCode) {
        textInput.change();

        flashGoodIndicator();
      }
    }

    function reset() {
      keyCode = defaultKeyCode;
    }

    function bindKeyEvents() {
      textInput.unbind("keyup", processKeyUp).bind("keyup", processKeyUp);
      textInput.unbind("keydown", processKeyDown).bind("keydown", processKeyDown);
    }

    function unbindKeyEvents() {
      textInput.unbind("keyup", processKeyUp);
      textInput.unbind("keydown", processKeyDown);
    }

    function onBlur() {
      reset();

      textInput.removeClass(Indicator.FOCUS);
    }

    function onFocus() {
      if (!textInput.hasClass(Indicator.BAD))
        showFocusIndicator();
    }

    /*
     * Public Methods
     */
    function start(focus) {
      reset();

      textInput.unbind("blur", onBlur).bind("blur", onBlur);
      textInput.unbind("focus", onFocus).bind("focus", onFocus);

      bindKeyEvents();

      // Listen for message events from the extension background script.
      chrome.extension.onMessage.addListener(onMessage);

      if (focus)
        textInput.focus();
    }

    function stop() {
      textInput.blur();

      textInput.unbind("blur", onBlur);
      textInput.unbind("focus", onFocus);

      unbindKeyEvents();

      // Stop listening for message events from the extension background script.
      chrome.extension.onMessage.removeListener(onMessage);

      clearTimeout(detectTimeoutId);
      clearTimeout(resetTimeoutId);
      clearTimeout(flashTimeoutId);

      removeIndicators();
    }

    return {
      reset : reset,
      start : start,
      stop : stop
    };
  };

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});
