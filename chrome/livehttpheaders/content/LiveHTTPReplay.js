//  **** BEGIN LICENSE BLOCK ****
//  Copyright(c) 2002-2003 Daniel Savard.
//
//  LiveHTTPHeaders: this programs have two purpose
//  - Add a tab in PageInfo to show http headers sent and received
//  - Add a tool that display http headers in real time while loading pages
//
//  This program is free software; you can redistribute it and/or modify it under
//  the terms of the GNU General Public License as published by the Free
//  Software Foundation; either version 2 of the License, or (at your option)
//  any later version.
//
//  This program is distributed in the hope that it will be useful, but
//  WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
//  or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
//  more details.
//
//  You should have received a copy of the GNU General Public License along with
//  this program; if not, write to the Free Software Foundation, Inc., 59 Temple
//  Place, Suite 330, Boston, MA 02111-1307 USA
//  **** END LICENSE BLOCK ****
if(!livehttpheaders) var livehttpheaders={};
if(!livehttpheaders.replay) livehttpheaders.replay={};

livehttpheaders.replay.live = window.arguments[0];
livehttpheaders.replay.init = function() {
  var args = window.arguments;

  document.getElementById("livehttpheaders.replay.method").value = args[1];
  document.getElementById("livehttpheaders.replay.url").value = args[2];
  document.getElementById("livehttpheaders.replay.version").value = args[3];
  document.getElementById("livehttpheaders.replay.headers").value = args[4];
  if (args[5] != null) {
    document.getElementById("livehttpheaders.replay.post").value = livehttpheaders.replay.stringToEscape(args[5]);
    document.getElementById("livehttpheaders.replay.sendpost").checked="true";
  }

  livehttpheaders.replay.updatePost();
}

livehttpheaders.replay.play = function() {
  var method = document.getElementById("livehttpheaders.replay.method").value;
  var url = document.getElementById("livehttpheaders.replay.url").value;
  var version = document.getElementById("livehttpheaders.replay.version").value;
  var headers = document.getElementById("livehttpheaders.replay.headers").value;
  var post = null;
  if (document.getElementById("livehttpheaders.replay.sendpost").checked) {
    post = livehttpheaders.replay.escapeToString(document.getElementById("livehttpheaders.replay.post").value);
  }

  livehttpheaders.replay.live.play(method,url,version,headers,post);
}

livehttpheaders.replay.updatePost = function() {
  var cl = document.getElementById("livehttpheaders.replay.contentlength");
  var post = document.getElementById("livehttpheaders.replay.post");
  var sendpost = document.getElementById("sendpost");
  var method = document.getElementById("livehttpheaders.replay.method");

  var s = livehttpheaders.replay.escapeToString(post.value);
  cl.value = s.length;
  //post.value = livehttpheaders.replay.stringToEscape(s);
  if (document.getElementById("livehttpheaders.replay.sendpost").checked) { 
    sendpost.removeAttribute('disabled');
    method.value="POST";
  } else { 
    sendpost.setAttribute('disabled','true');
    method.value="GET";
  }
}

livehttpheaders.replay.playexit = function() {
  livehttpheaders.replay.play();
  livehttpheaders.replay.close();
}

// Convert s from hexadecimal to decimal
livehttpheaders.replay.hexToDec = function(s) {
  const conv = {'0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8,
                '9':9, 'a':10, 'A':10, 'b':11, 'B':11, 'c':12, 'C':12,
                'd':13, 'D':13, 'e':14, 'E':14, 'f':15, 'F':15}

  var out = 0;
  for (var i=s.length-1, pow=1; i>=0; i--, pow*=16) { 
    out += conv[s.charAt(i)]*pow;
  }
  return out;
}

// Convert v from decimal to hexadecimal with d digits (including front 0)
livehttpheaders.replay.decToHex = function(v,d) {
  return ("000000000000"+Math.round(v).toString(16)).slice(-d);
}

livehttpheaders.replay.stringToEscape = function(s) {
  const conv = {'\x00':'\\0', '\x07':'\\a', '\x08':'\\b', '\x09':'\\t', 
                '\x0a':'\\n\n', '\x0b':'\\v', '\x0c':'\\f', '\x0d':'\\r', 
                '\x5c':'\\\\'}
  
  var out = s.replace(/([\x00\x07-\x0d\\])|([\x00-\x1f\x7f-\x9f])|([\u0100-\uffff])/g, function(s,a,b,c) {
      if (a) { 
        return conv[a];
      } else if (b) {
        return "\\x"+livehttpheaders.replay.decToHex(b.charCodeAt(),2);
      } else {
        return "\\u"+livehttpheaders.replay.decToHex(c.charCodeAt(),4);
      } 
    });
  return out;
}
livehttpheaders.replay.escapeToString = function(s) {
  const conv = {'0':'\0', 'a':'\a', 'b':'\b', 't':'\t', 'n':'\n', 
                'v':'\v', 'f':'\f', 'r':'\r', '\\':'\\'}
  
  var out = s.replace(/\r|\n/g,"");
  out = out.replace(/\\x([0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})|\\(.)/g, function(s,a,b,c) {
      if (a) { 
        return String.fromCharCode(livehttpheaders.replay.hexToDec(a));
      } else if (b) {
        return String.fromCharCode(livehttpheaders.replay.hexToDec(b));
      } else if (c in conv) {
        return conv[c];
      } else {
        return c;
      }
    });
  return out;
}
