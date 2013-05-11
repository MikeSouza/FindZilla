/**
 *  @license Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {
  /**
   * Enum for command type values.
   * @enum {string}
   */
  FindZilla.CommandType = Object.freeze({
    'TOGGLE' : 'findzilla-toggle'
  });

  /**
   * Enum for option key values.
   * @enum {string}
   */
  FindZilla.OptionKey = Object.freeze({
    'ROOT' : 'options',
    'GENERAL' : 'general',
    'CRITERIA' : 'criteria',
    'HOTKEY' : 'hotkey'
  });

  /**
   * Enum for message type values.
   * @enum {number}
   */
  FindZilla.MessageType = Object.freeze({
    'UNKNOWN' : 0,
    'TOGGLE' : 1,
    'SAVE' : 2,
    'LOAD' : 3,
    'OPTION' : 4,
    'COMMAND' : 5
  });

  /**
   * Enum for search direction values.
   * @enum {number}
   */
  FindZilla.Direction = Object.freeze({
    'PREVIOUS' : -1,
    'CURRENT' : 0,
    'NEXT' : 1
  });

  /**
   * A message sent between extension pages and/ or content scripts.
   * @constructor
   * @param {number} type The message type.
   * @param {?} data The message data.
   */
  FindZilla.Message = function(type, data) {
    this.type = type;
    this.data = data;
  };

  /**
   * An object containing the search critera.
   * @constructor
   * @param {string} searchText The text to search for.
   * @param {boolean} matchCase Perform a case-sensitive search.
   * @param {boolean} wholeWords Match only whole words.
   * @param {number} direction The direction to search.
   */
  FindZilla.Criteria = function(searchText, matchCase, wholeWords, direction) {
    /*
     * Public Properties
     */
    this.direction = direction;
    this.matchCase = matchCase || false;
    this.wholeWords = wholeWords || false;
    this.searchText = !searchText.isEmpty() ? searchText : "";
    this.matchText = !matchCase ? searchText.toLowerCase() : searchText;
  };

  /**
   * An object containing the saved tab data.
   * @constructor
   * @param {boolean} visible The visibility of the {@link FindZilla.FindBar}.
   * @param {FindZilla.Criteria} criteria The search criteria of the {@link FindZilla.FindBar}.
   */
  FindZilla.TabData = function(visible, criteria) {
    this.visible = visible;
    this.criteria = criteria;
  };

  /**
   * Returns true if the URL belongs to this Chrome extension, otherwise false.
   * @return {boolean}
   */
  String.prototype.isExtensionUrl = function() {
    return this && (new RegExp("^chrome-extension:\/\/" + chrome.i18n.getMessage("@@extension_id") + "\/.*", "gi")).test(this);
  };

  /**
   * Returns true if the URL belongs to any Chrome extension, otherwise false.
   * @return {boolean}
   */
  String.prototype.isAnyExtensionUrl = function() {
    return this && /^chrome-extension:\/\/.*/gi.test(this);
  };

  /**
   * Returns true if the URL is any Chrome URL (including Chrome extensions), otherwise false.
   * @return {boolean}
   */
  String.prototype.isChromeUrl = function() {
    return this && /^chrome[a-z\-]*:\/\/.*/gi.test(this);
  };

  /**
   * Returns true if the {@see String} is empty, null, or undefined, otherwise false.
   * @return {boolean}
   */
  String.prototype.isEmpty = function() {
    return !this || 0 === this.length;
  };

  /**
   * Returns true if the {@see String} is blank, empty, null, or undefined, otherwise false.
   * @return {boolean}
   */
  String.prototype.isBlank = function() {
    return !this || /^\s*$/.test(this);
  };

  /**
   * Returns the reversed {@see String}, or an empty string if the string is null or undefined.
   * @return {boolean}
   */
  String.prototype.reverse = function() {
    var o = '';

    if (!this)
      return o;

    for (var i = this.length - 1; i >= 0; i--)
      o += this[i];

    return o;
  };

  /**
   * Returns the first element of an {@see Array}, or null if empty or undefined.
   * @return {?}
   */
  Array.prototype.first = function() {
    if (this && this.length > 0) {
      return this[0];
    }

    return null;
  };

  /**
   * Returns the last element of an {@see Array}, or null if empty or undefined.
   * @return {?}
   */
  Array.prototype.last = function() {
    if (this && this.length > 0) {
      return this[this.length - 1];
    }

    return null;
  };

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});
