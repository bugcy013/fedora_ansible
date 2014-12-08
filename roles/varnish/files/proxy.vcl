#This is a basic VCL configuration file for varnish.  See the vcl(7)
#man page for details on VCL syntax and semantics.
#
#Default backend definition.  Set this to point to your content
#server.
#
sub vcl_error {
    if (obj.status == 400 || obj.status == 413) {
        return(deliver);
    }
}

backend wiki {
    .host = "localhost";
    .port = "10001";
    .first_byte_timeout = 120s;
}

backend mirrorlists {
    .host = "localhost";
    .port = "10002";
}

backend pkgdb {
    .host = "localhost";
    .port = "10003";
    .first_byte_timeout = 160s;
}

backend fas {
    .host = "localhost";
    .port = "10004";
}


backend voting {
    .host = "localhost";
    .port = "10007";
}

backend mirrormanager {
    .host = "localhost";
    .port = "10008";
}

backend bodhi {
    .host = "localhost";
    .port = "10009";
}

backend freemedia {
    .host = "localhost";
    .port = "10011";
}

backend packages {
    .host = "localhost";
    .port = "10016";
}

backend tagger {
    .host = "localhost";
    .port = "10017";
}

backend askbot {
    .host = "localhost";
    .port = "10021";
}

backend blockerbugs {
    .host = "localhost";
    .port = "10022";
}

backend fedocal {
    .host = "localhost";
    .port = "10023";
}

backend kerneltest {
    .host = "localhost";
    .port = "10038";
}

backend paste {
    .host = "localhost";
    .port = "10027";
}

acl purge {
    "192.168.1.3";
    "192.168.1.4";
    "192.168.1.5";
    "192.168.1.6";
    "192.168.1.13";
    "192.168.1.24";
    "192.168.1.23";
    "192.168.1.41";
    "10.5.126.31";
    "10.5.126.32";
    "10.5.126.33";
    "10.5.126.34";
    "10.5.126.37";
    "10.5.126.38";
}

sub vcl_recv {
    if (req.request == "PURGE") {
        if (!client.ip ~ purge) {
            error 405 "Not allowed.";
        }
        if (req.url ~ "^http://") {
            set req.url = regsub(req.url, "http://localhost:6081","");
        }
        purge_url(req.url);
    }

    if (req.url ~ "^/wiki/") {
        set req.backend = wiki;
    }
    if (req.url ~ "^/w/") {
        set req.backend = wiki;
        if (req.url ~ "^/w/skins/") {
            unset req.http.cookie;
            set req.url = regsub(req.url, "\?.*", "");
        }
    }
    if (req.url ~ "^/mirrorlist/") {
        set req.backend = mirrorlists;
    }
    if (req.url ~ "^/pkgdb") {
        set req.backend = pkgdb;
        if ((req.url ~ "^/pkgdb/appicon/show/") || (req.url ~ "^/pkgdb/static/") || (req.url ~ "^/pkgdb/tg_js/")) {
            unset req.http.cookie;
            set req.url = regsub(req.url, "\?.*", "");
        }
    }
    if (req.url ~ "^/accounts/") {
        set req.backend = fas;
    }
    if (req.url ~ "^/voting/") {
        set req.backend = voting;
    }
    if (req.url ~ "^/mirrormanager/") {
        set req.backend = mirrormanager;
    }
    if (req.url ~ "^/updates/") {
        set req.backend = bodhi;
    }
    if (req.url ~ "^/freemedia/") {
        set req.backend = freemedia;
    }
    if (req.url ~ "^/packages/") {
        set req.backend = packages;
    }
    if (req.url ~ "^/tagger/") {
        set req.backend = tagger;
    }
    if (req.url ~ "^/calendar") {
        set req.backend = fedocal;
        if (req.url ~ "^/calendar/static/") {
            unset req.http.cookie;
            set req.url = regsub(req.url, "\?.*", "");
        }
    }
    if (req.url ~ "^/kerneltest") {
        set req.backend = kerneltest;
    }
    if (req.http.X-Forwarded-Server ~ "^paste.fedoraproject.org") {
        set req.backend = paste;
        if ((req.url ~ "^/skins/") || (req.url ~ "^/addons/") || (req.url ~ "^/admin/skins/")) {
            unset req.http.cookie;
            set req.url = regsub(req.url, "\?.*", "");
        }
    }
    if (req.http.X-Forwarded-Server ~ "^ask.fedoraproject.org") {
        set req.backend = askbot;
        if (req.url ~ "^/m/") {
            unset req.http.cookie;
            set req.url = regsub(req.url, "\?.*", "");
        }
    }
    if (req.http.X-Forwarded-Server ~ "^qa.fedoraproject.org") {
        if (req.url ~ "^/blockerbugs") {
            set req.backend = blockerbugs;
            if (req.url ~ "^/blockerbugs/static/") {
                unset req.http.cookie;
                set req.url = regsub(req.url, "\?.*", "");
            }

        }
    }

    # Pass any requests with the "If-None-Match" header directly.
    if (req.http.If-None-Match) {
        return (pass);
    }

    # Force lookup if the request is a no-cache request from the client.
    if (req.http.Cache-Control ~ "no-cache") {
        purge_url(req.url);
    }
    if (req.http.Accept-Encoding) {
        if (req.url ~ "\.(jpg|png|gif|gz|tgz|bz2|tbz|mp3|ogg)$") {
            # No point in compressing these
            remove req.http.Accept-Encoding;
        } elsif (req.http.Accept-Encoding ~ "gzip") {
            # This is currently a bug with ipv6, so we need to nuke it.
            remove req.http.Accept-Encoding;
        } elsif (req.http.Accept-Encoding ~ "deflate") {
            set req.http.Accept-Encoding = "deflate";
        } else {
            # unknown algorithm
            remove req.http.Accept-Encoding;
        }
    }
}

# When requesting application icons, don't allow cherrypy to set cookies
sub vcl_fetch {
    if ((req.url ~ "^/pkgdb/appicon/show/") || (req.url ~ "^/pkgdb/static/") || (req.url ~ "^/pkgdb/tg_js/") || (req.url ~ "^/blockerbugs/static/")) {
        unset beresp.http.set-cookie;
    }
    if (beresp.status == 301) {
        return (pass);
    }
}
