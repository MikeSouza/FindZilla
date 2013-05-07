/*
 *  Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {
  /*
   * Public Constructors
   */
  FindZilla.FindPanel = function(root) {
    /*
     * Create DOM elements with jQuery
     */
    this.closeButton = $('<button>').attr({
      'id' : 'findbar-button-close'
    });

    this.findLabel = $('<label>').attr({
      'id' : 'findbar-label-find',
      'for' : 'findbar-textbox-find'
    }).text(chrome.i18n.getMessage("find_label"));

    this.findTextBox = $('<input>').attr({
      'id' : 'findbar-textbox-find',
      'name' : 'findTextBox',
      'type' : 'text',
      'value' : ''
    });

    this.prevButton = $('<button>').attr({
      'id' : 'findbar-button-prev'
    }).text(chrome.i18n.getMessage("prev_button"));

    this.nextButton = $('<button>').attr({
      'id' : 'findbar-button-next'
    }).text(chrome.i18n.getMessage("next_button"));

    this.matchCaseCheckBox = $('<input>').attr({
      'id' : 'findbar-checkbox-matchcase',
      'name' : 'matchCaseCheckBox',
      'type' : 'checkbox'
    });

    this.matchCaseLabel = $('<label>').attr({
      'id' : 'findbar-label-matchcase',
      'for' : 'findbar-checkbox-matchcase'
    }).text(chrome.i18n.getMessage("match_case_label"));

    this.matchWordCheckBox = $('<input>').attr({
      'id' : 'findbar-checkbox-matchword',
      'name' : 'matchWordCheckBox',
      'type' : 'checkbox'
    });

    this.matchWordLabel = $('<label>').attr({
      'id' : 'findbar-label-matchword',
      'for' : 'findbar-checkbox-matchword'
    }).text(chrome.i18n.getMessage("match_words_label"));

    this.findBar = $('<div>').attr({
      'id' : 'findbar'
    }).append(this.findLabel, this.findTextBox, this.prevButton, this.nextButton, this.matchCaseCheckBox, this.matchCaseLabel, this.matchWordCheckBox, this.matchWordLabel, this.closeButton).hide();

    /*
     * Apply jQuery UI CSS/ Styles to DOM elements
     */
    this.findBar.addClass('ui-widget-content ui-corner-all findbar');

    // HACK:  Setting the CSS position property as fixed in the external stylesheet does not work, must
    // programmatically add CSS position property as fixed at runtime to correctly display in the bottom-right of the
    // browser page.
    this.findBar.css({
      'position' : 'fixed'
    });

    /*
     * Apply jQuery UI Widgets to DOM elements
     */
    this.closeButton.button({
      text : false,
      icons : {
        primary : "ui-icon-circle-close"
      }
    });

    this.prevButton.button({
      text : false,
      icons : {
        primary : "ui-icon-triangle-1-n"
      }
    });

    this.nextButton.button({
      text : false,
      icons : {
        primary : "ui-icon-triangle-1-s"
      }
    });

    /*
     * Apply jQuery UI Effects to DOM elements
     */
    this.findBar.draggable({
      cursor : "move",
      containment : "window",
      scroll : false
    });

    /*
     * Apply the panel to the root element
     */
    $(root).append($('<FindZilla>').append(this.findBar));
  };

  FindZilla.PageManager = function() {
    /*
     * Private Properties
     */
    var findPanel = new FindZilla.FindPanel(document.body);
    var findWalker = new FindZilla.FindWalker();
    var visible = findPanel.findBar.is(':visible');
    var toggleKey = 70;

    /*
     * Private Methods
     */
    function getCriteria() {
      var searchText = findPanel.findTextBox.val();
      var matchCase = findPanel.matchCaseCheckBox.is(':checked');
      var wholeWords = findPanel.matchWordCheckBox.is(':checked');

      return new FindZilla.Criteria(searchText, matchCase, wholeWords);
    }

    function onPrevious() {
      var criteria = getCriteria();

      if (criteria) {
        criteria.direction = FindZilla.Direction.PREVIOUS;
        findWalker.previous(criteria);
      }
    }

    function onNext() {
      var criteria = getCriteria();

      if (criteria) {
        criteria.direction = FindZilla.Direction.NEXT;
        findWalker.next(criteria);
      }
    }

    function onKeyUp(e) {
      switch (e.keyCode) {
        case 27:
          hide();
          break;
        default:
          break;
      }
    }

    function onKeyDown(e) {
      switch (e.keyCode) {
        case 13:
          onNext();
          break;
        default:
          break;
      }
    }

    function handleOptionRequest(data) {
      if (!data || !data.option)
        return;

      var option = data.option;

      if (option.section == FindZilla.OptionKey.HOTKEY && option.key == "toggleHotkey") {
        console.log("Option changed: " + JSON.stringify(data));
        toggleKey = data.value.charCodeAt();
      }
    }

    function onMessage(request, sender, sendResponse) {
      if (window.self != window.top)
        return;

      console.log("Message from: " + sender.tab.url + "(" + request.type + ")");

      switch (request.type) {
        case FindZilla.MessageType.TOGGLE:
          var visible = toggle();

          sendResponse({
            visible : visible
          });
          break;
        case FindZilla.MessageType.LOAD:
          //console.log("Received load request!");
          load(request.data);
          break;

        case FindZilla.MessageType.OPTION:
          console.log("Received option request: " + JSON.stringify(request.data));

          handleOptionRequest(request.data);

          break;

        default:
          break;
      }
    }

    function sendSaveRequest() {
      if (window.self != window.top)
        return;

      var criteria = getCriteria();

      if (!criteria)
        return;

      chrome.extension.sendMessage(new FindZilla.Message(FindZilla.MessageType.SAVE, new FindZilla.TabData(visible, criteria)), function(response) {
        console.log("Successfully saved tab data: " + JSON.stringify(response));
      });
    }

    function registerListeners() {
      findPanel.closeButton.bind("click", hide);

      findPanel.prevButton.bind("click", onPrevious);

      findPanel.nextButton.bind("click", onNext);

      findPanel.findTextBox.bind("keydown", onKeyDown);
      findPanel.findTextBox.bind("keyup", onKeyUp);

      window.addEventListener("keyup", onKeyUp, false);
      window.addEventListener("beforeunload", sendSaveRequest, false);
    }

    function unregisterListeners() {
      findPanel.closeButton.unbind("click", hide);

      findPanel.prevButton.unbind("click", onPrevious);

      findPanel.nextButton.unbind("click", onNext);

      findPanel.findTextBox.unbind("keydown", onKeyDown);
      findPanel.findTextBox.unbind("keyup", onKeyUp);

      window.removeEventListener("keyup", onKeyUp, false);
      window.removeEventListener("beforeunload", sendSaveRequest, false);
    }

    function show() {
      if (window.self != window.top)
        return;

      if (!visible) {
        try {
          registerListeners();

          findPanel.findBar.fadeIn(100, findPanel.findBar.show);

          findPanel.findBar.focus();
          findPanel.findTextBox.focus().select();
        } finally {
          visible = true;
        }
      }
    }

    function hide() {
      if (window.self != window.top)
        return;

      if (visible) {
        try {
          unregisterListeners();

          findPanel.findBar.fadeOut(100, findPanel.findBar.hide);

          window.focus();
        } finally {
          visible = false;
        }

        sendSaveRequest();
      }
    }

    function toggle() {
      if (visible)
        hide();
      else
        show();

      return visible;
    }

    function load(data) {
      if (!data || !data.criteria)
        return;

      var criteria = data.criteria;

      findPanel.findTextBox.val(criteria.searchText);
      findPanel.matchCaseCheckBox.prop('checked', criteria.matchCase);
      findPanel.matchWordCheckBox.prop('checked', criteria.wholeWords);

      if (data.visible)
        show();
      else
        hide();

      if (data.hotkey && data.hotkey.toggleEnable) {
        toggleKey = data.hotkey.toggleHotkey.charCodeAt();
      }
    }

    function handleToggleHotkey(e) {
      if (toggleKey == e.keyCode && e.shiftKey && e.ctrlKey) {
        pageManager.toggle();
      }
    }

    /*
     * Public Methods
     */
    function init() {
      // Listen for message events from the extension background script.
      chrome.extension.onMessage.addListener(onMessage);

      window.addEventListener("keydown", handleToggleHotkey, false);
    }

    return {
      init : init,
      toggle : toggle
    };
  };

  var pageManager = new FindZilla.PageManager();

  pageManager.init();

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});
