/*
 *  Copyright (c) 2013 Michael Souza <contact@michael-souza.com>
 *  This source code is released under the MIT license. (http://opensource.org/licenses/MIT)
 */

(function(FindZilla, undefined) {
  /*
   * Constants
   */
  FindZilla.FindMatchType = Object.freeze({
    NO_MATCH : 0,
    FIRST_MATCH : 1,
    PARTIAL_MATCH : 2,
    FULL_MATCH : 4
  });

  /*
   * Private Constructors
   */
  function FindState(matchCriteria) {
    /*
     * Private Members
     */
    var node;

    /*
     * Public Members
     */
    this.criteria = matchCriteria;
    this.kmpNext = matchCriteria.matchText ? new Array(matchCriteria.matchText.length) : null;
    this.kmpOffset = 0;
    this.offset = 0;
    this.matchOffset = 0;
    this.text = "";

    this.set = function(textNode, textOffset, matchOffset) {
      node = textNode || null;
      this.text = (node && (!matchCriteria.matchCase ? node.nodeValue.toLowerCase() : node.nodeValue)) || "";

      if (textOffset !== undefined) {
        if (textOffset > -1) {
          this.offset = textOffset;
        }
      }

      if (matchOffset !== undefined) {
        if (matchOffset > -1) {
          this.matchOffset = matchOffset;
        }
      }
    }

    this.get = function() {
      return node;
    }

    this.isValid = function() {
      if (!node || this.text.isEmpty())
        return false;

      var parentNode = node.parentNode;

      if (parentNode && (parentNode.offsetWidth < 1 || parentNode.offsetHeight < 1))
        return false;

      var parentNodeName = parentNode.nodeName;

      if (parentNodeName === "SCRIPT" || parentNodeName === "NOSCRIPT" || parentNodeName === "STYLE" || parentNodeName === "TEXTAREA")
        return false;

      if (( parentNode = parentNode.parentNode) && ( parentNode = parentNode.parentNode) && parentNode.nodeName === "FINDZILLA")
        return false;

      if (node.nodeType === 8)
        return false;

      var style = window.getComputedStyle(parentNode, null);

      if (style && style.display === "none")
        return false;

      return true;
    }

    this.hasMatch = function() {
      return this.matchOffset > 0;
    }

    this.isFullMatch = function() {
      return this.matchOffset == matchCriteria.matchText.length;
    }

    this.isPartialMatch = function() {
      return this.matchOffset > 0 && this.matchOffset < matchCriteria.matchText.length;
    }
  };

  function FindRange(direction) {
    /*
     * Private Members
     */
    var nodes = [];
    var offsets = [];
    var matchType = FindZilla.FindMatchType.NO_MATCH;

    /*
     * Private Methods
     */
    function getStartingIndex(curState) {
      switch (direction) {
        case FindZilla.Direction.NEXT:
          return 0;
        case FindZilla.Direction.PREVIOUS:
          return curState.text.length;
        default:
          return 0;
      }
    }

    /*
     * Public Methods
     */
    function add(curState) {
      var modifier = direction;
      var startingIndex = getStartingIndex(curState);
      var offset = (startingIndex + direction * curState.offset);

      matchType = FindZilla.FindMatchType.NO_MATCH;

      if (curState.isFullMatch()) {
        matchType = FindZilla.FindMatchType.FULL_MATCH;

        if (nodes.length == 0) {
          modifier *= curState.criteria.matchText.length;

          nodes.push(curState.get());
          offsets.push(offset - modifier);

          matchType |= FindZilla.FindMatchType.FIRST_MATCH;
        }

        nodes.push(curState.get());
        offsets.push(offset);

        return matchType;
      }

      if (curState.isPartialMatch()) {
        matchType = FindZilla.FindMatchType.PARTIAL_MATCH;

        if (nodes.length == 0) {
          matchType |= FindZilla.FindMatchType.FIRST_MATCH;
        }

        modifier *= curState.matchOffset;

        nodes.push(curState.get());
        offsets.push(offset - modifier);
      }

      return matchType;
    }

    function clear() {
      nodes.length = 0;
      offsets.length = 0;
    }

    function getStart() {
      switch (direction) {
        case FindZilla.Direction.NEXT:
          return {
            node : nodes.first(),
            offset : offsets.first()
          };
        case FindZilla.Direction.PREVIOUS:
          return {
            node : nodes.last(),
            offset : offsets.last()
          };
        default:
          return null;
      }
    }

    function getEnd() {
      switch (direction) {
        case FindZilla.Direction.NEXT:
          return {
            node : nodes.last(),
            offset : offsets.last()
          };
        case FindZilla.Direction.PREVIOUS:
          return {
            node : nodes.first(),
            offset : offsets.first()
          };
        default:
          return null;
      }
    }

    function getRange() {
      var start = getStart();
      var end = getEnd();

      if (!start || !end)
        return null;

      var range = document.createRange();

      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);

      return range;
    }

    function getMatchType() {
      return matchType;
    }

    function resize(length) {
      if (nodes.length == 0) {
        return;
      }

      var node = nodes.first();
      var offset = offsets.first();

      var nodeLen = node.nodeValue.length;

      if (nodeLen > length) {
        var startPos = offset + direction * length;

        if (startPos == nodeLen) {
          nodes.shift();
          offsets.shift();

          return;
        } else if (startPos < nodeLen) {
          offsets[0] = startPos;
          return;
        } else {
          nodeLen = 0;
          length = startPos - nodeLen;
        }
      } else if (nodeLen == length) {
        nodes.shift();
        offsets.shift();

        return;
      }

      while (node && nodeLen < length) {
        length -= nodeLen;

        nodes.shift();
        offsets.shift();

        if (nodes.length == 0) {
          return;
        }

        node = nodes.first();
        offset = offsets.first();

        nodeLen = node.nodeValue.length;
      }

      offsets[0] = length;
    }

    return {
      add : add,
      clear : clear,
      getStart : getStart,
      getEnd : getEnd,
      nodes : nodes,
      getRange : getRange,
      getMatchType : getMatchType,
      resize : resize
    };
  };

  function FindSelection(doc) {
    /*
     * Private Methods
     */
    function scrollIntoView(range) {
      var node, tempNode;
      var bounds;
      range = range.cloneRange();

      range.collapse(true);

      node = range.startContainer;

      // If the start node of the range is an element, then the startOffset is the child node index the range starts at.
      // Otherwise the start node is a text node, skip back to the first sibling node that is an element.
      if (node.nodeType == 1) {
        node = node.childNodes[range.startOffset];

        if (node.nodeType == 1) {
          tempNode = node;
          // In order to prevent the browser from scrolling past if the node is a <BR> element, skip back to the first
          // sibling that is not a <BR> element.
          while (tempNode && tempNode.nodeType == 1 && tempNode.tagName == "BR") {
            tempNode = tempNode.previousSibling;
          }

          if (tempNode) {
            node = tempNode;
          }
        }
      } else {
        tempNode = node;

        while (tempNode && tempNode.nodeType != 1) {
          tempNode = tempNode.previousSibling;
        }

        node = tempNode || node.parentNode;
      }

      if (node) {
        node.scrollIntoView(false);
      }
    }

    /*
     * Public Methods
     */
    function select(findRange) {
      var range = findRange.getRange();

      if (range) {

        doc.getSelection().removeAllRanges();
        doc.getSelection().addRange(range);

        scrollIntoView(range);
      }
    }

    return {
      select : select
    };
  }

  /*
   * Public Constructors
   */
  FindZilla.FindWalker = function() {
    /*
     * Private Members
     */
    var findSelection = new FindSelection(document);
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, true);
    var lastState;

    /*
     * Private Methods
     */
    function getNextNode() {
      return walker.nextNode();
    }

    function getPreviousNode() {
      return walker.previousNode();
    }

    function isWordChar(charCode) {
      return charCode && ((charCode >= 65 && charCode <= 90) || charCode == 95 || (charCode >= 97 && charCode <= 122));
    }

    function findNextInNode(curState, findRange) {
      var p = curState.criteria.matchText;
      var s = curState.text;
      var k = curState.kmpNext;
      var m = p.length;
      var n = s.length;

      // Use the previously set offsets from both the current text node and pattern text,
      // because this may be a non-zero index if the match spans multiple text nodes.
      var i = curState.offset;
      var j = curState.matchOffset;

      for (; i < n && j < m; i++, j++) {
        while (j > -1 && s[i] !== p[j]) {
          // If failed to match a character after having matched at least the first character
          // of the pattern text, discard all previously matched characters up to the next
          // computed backtrack position.
          if (k[j] > -1) {
            findRange.resize(j - k[j]);
          }

          j = k[j];
        }
      }

      curState.kmpOffset = k[j] > -1 ? k[j] : 0;
      curState.offset = i;
      curState.matchOffset = j;
    }

    function findPrevInNode(curState, findRange) {
      var p = curState.criteria.matchText;
      var s = curState.text;
      var k = curState.kmpNext;
      var m = p.length;
      var n = s.length;

      // Use the previously set offsets from both the current text node and pattern text,
      // because this may be a non-zero index if the match spans multiple text nodes.
      var i = curState.offset;
      var j = curState.matchOffset;

      var dj = m - j - 1;
      var di = n - i - 1;

      for (; i < n && j < m; i++, j++, di--, dj--) {
        while (j >= 0 && s[di] !== p[dj]) {
          // If failed to match a character after having matched at least the first character
          // of the pattern text, discard all previously matched characters up to the next
          // computed backtrack position.
          if (k[j] > -1) {
            findRange.resize(j - k[j]);
          }

          j = k[j];
          dj = m - j - 1;
        }
      }

      curState.kmpOffset = k[j] > -1 ? k[j] : 0;
      curState.offset = i;
      curState.matchOffset = j;
    }

    function find(criteria, findInNodeCallback, nextNodeCallback, prevNodeCallback) {
      var curState = new FindState(criteria);
      var findRange = new FindRange(criteria.direction);

      var matchType = FindZilla.FindMatchType.NO_MATCH;

      if (criteria.direction == FindZilla.Direction.NEXT) {
        curState.kmpNext = kmpPreprocess(curState.criteria.matchText);
      } else {
        curState.kmpNext = kmpPreprocess(curState.criteria.matchText.reverse());
      }

      if (lastState) {
        if (lastState.criteria.direction !== criteria.direction) {
          curState.set(nextNodeCallback(), 0, 0);
        } else {
          curState.set(lastState.get(), lastState.offset - lastState.kmpOffset, 0);
        }
      } else {
        curState.set(nextNodeCallback(), 0, 0);
      }

      while (curState.get()) {
        if (!curState.isValid()) {
          findRange.clear();

          curState.set(nextNodeCallback(), -1, 0);

          continue;
        }

        findInNodeCallback(curState, findRange);

        if (!curState.hasMatch()) {
          findRange.clear();
        } else {
          matchType = findRange.add(curState);

          if (matchType & FindZilla.FindMatchType.FULL_MATCH) {
            if (criteria.wholeWords) {
              if (!matchWholeWords(findRange, nextNodeCallback, prevNodeCallback)) {
                curState.set(curState.get(), -1, 0);
                continue;
              }
            }

            findSelection.select(findRange);

            return curState;
          }
        }

        curState.set(nextNodeCallback(), 0, -1);
      }

      while (prevNodeCallback()) {
      };

      return null;
    }

    function matchWholeWords(findRange) {
      var curState = walker.currentNode;
      var start = findRange.getStart();
      var end = findRange.getEnd();
      var textNode;

      if (start.offset == 0) {
        walker.currentNode = start.node;

        textNode = walker.previousNode();

        walker.currentNode = curState;

        if (textNode && isWordChar(textNode.nodeValue.charCodeAt(textNode.nodeValue.length - 1))) {
          return false;
        }
      } else {
        if (isWordChar(start.node.nodeValue.charCodeAt(start.offset - 1))) {
          return false;
        }
      }

      if (end.offset == 0) {
        walker.currentNode = end.node;

        textNode = walker.nextNode();

        walker.currentNode = curState;

        if (textNode && isWordChar(textNode.nodeValue.charCodeAt(0))) {
          return false;
        }
      } else {
        if (isWordChar(end.node.nodeValue.charCodeAt(end.offset))) {
          return false;
        }
      }

      return true;
    }

    function kmpPreprocess(p) {
      var m = p.length;
      var i = 0;
      var k = new Array(m + 1);
      var j = k[i] = -1;

      while (i < m) {
        while (j > -1 && p[i] != p[j]) {
          j = k[j];
        }

        i++;
        j++;

        k[i] = j;
      }

      return k;
    }

    /*
     * Public Methods
     */
    function next(criteria) {
      if (criteria.searchText.isBlank()) {
        return;
      }

      lastState = find(criteria, findNextInNode, getNextNode, getPreviousNode);

      if (!lastState) {
        lastState = find(criteria, findNextInNode, getNextNode, getPreviousNode);
      }
    }

    function previous(criteria) {
      if (criteria.searchText.isBlank()) {
        return;
      }

      lastState = find(criteria, findPrevInNode, getPreviousNode, getNextNode);

      if (!lastState) {
        lastState = find(criteria, findPrevInNode, getPreviousNode, getNextNode);
      }
    }

    return {
      next : next,
      previous : previous
    };
  };

  // Check whether 'FindZilla' exists in the global namespace.
  // If not, assign window.FindZilla an object literal.
})(window.FindZilla = window.FindZilla || {});
