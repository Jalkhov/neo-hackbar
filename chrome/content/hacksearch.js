var hacksearch = {
    getDocument: function() {
        return window._content
    },
    goToWebService: function(f) {
        var b = "http://www.google.com/search?as_q=";
        var k = "http://www.robtex.com/dns/";
        var i = "http://www.intodns.com/";
        var c = "http://penzil-hacksearch.blogspot.com";
        var g = "http://google.com/safebrowsing/diagnostic?site=";
        var j = "http://www.siteadvisor.com/sites/";
        var m = "http://safeweb.norton.com/report/show?url=";
        var d = "http://www.avgthreatlabs.com/sitereports/domain/";
        var l = "http://dnsw.info/";
        var e = "http://rbls.org/";
        var a = "http://www.alexa.com/siteinfo/";
        var h = "http://builtwith.com/";
        switch (f) {
            case "wSite":
                this.goTo(b + "site:" + this.getDocument().document.domain);
                break;
            case "eSite":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "iLink":
                this.goTo(b + "link:" + this.getDocument().document.domain.replace("www.", "") + "+site:" + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "bLink":
                this.goTo(b + "link:" + this.getDocument().document.domain.replace("www.", "") + "+-site:" + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "subdomain":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+-site:" + this.getDocument().document.domain);
                break;
            case "url":
                this.goTo(b + "inurl:" + this.getDocument().document.domain.replace(/www.|.com|.in|.org|.co.in|.edu|.gov|.net|.info|.uk|.ae/ig, "") + "+-site:" + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "Userpass":
                this.goTo(b + "intext:" + this.getDocument().document.domain.replace(/www./ig, "") + "+intext:(username||password||passwd||pwd||uname||paswd||passw0rd)");
                break;
            case "email":
                this.goTo(b + '"*@' + this.getDocument().document.domain.replace("www.", "") + '"');
                break;
            case "adminlogin":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+inurl:admin||administrator||adm||login||l0gin");
                break;
            case "Misc":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+inurl:history||access||log||license||readme||meta||root||sql||source||include||private||src||cgi||conf||account||asset||attach||audit||upload||auth||backup||bkup||build||cmd||demo||sample||default||mail||bin||etc");
                break;
            case "docs":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+filetype:pdf || filetype:doc || filetype:xml || filetype:txt ||  filetype:xls || filetype:ppt || filetype:pps || filetype:docx || filetype:wps || filetype:rtf || filetype:csv || filetype:pptx || filetype:xlsx || filetype:xlr");
                break;
            case "conf":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+filetype:pwl || filetype:pol || filetype:pl || filetype:sh ||filetype:ini || filetype:ht || filetype:exe || filetype:cgi || filetype:api || filetype:pdb || filetype:sql || filetype:ins || filetype:cfg || filetype:keychain || filetype:prf");
                break;
            case "Bkup":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+filetype:ost || filetype:bak || filetype:eml || filetype:bck || filetype:bac || filetype:tmp");
                break;
            case "arch":
                this.goTo(b + "site:" + this.getDocument().document.domain.replace("www.", "") + "+filetype:zip || filetype:rar || filetype:jar || filetype:tar.gz || filetype:7z || filetype:tar.b2z || filetype:tar.7z || filetype:tar");
                break;
            case "DomainH":
                this.goTo(i + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "Dinfo":
                this.goTo(k + this.getDocument().document.domain.replace("www.", "") + ".html");
                break;
            case "googleSafebrowsing":
                this.goTo(g + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "siteadvisor":
                this.goTo(j + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "norton":
                this.goTo(m + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "avgthreatlabs":
                this.goTo(d + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "dnsw":
                this.goTo(l + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "rbls":
                this.goTo(e + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "alexa":
                this.goTo(a + this.getDocument().document.domain.replace("www.", ""));
                break;
            case "builtWith":
                this.goTo(h + this.getDocument().document.domain.replace("www.", ""));
                break;
            default:
                this.goTo(c)
        }
    },
    goTo: function(a) {
        gBrowser.addTab(a)
    }
}
