var fedmenu = function(options) { $(document).ready(function() {
    var defaults = {
        'url': 'https://apps.fedoraproject.org/js/data.js',
        'mimeType': undefined,  // Only needed for local development

        'context': document,  // Alternatively, parent.document for iframes.

        'position': 'bottom-left',

        'user': null,
        'package': null,
    };

    // Our options object is called 'o' for shorthand
    var o = $.extend({}, defaults, options || {});

    // Also, hang on to the selector context with a shorthand 'c'
    var c = o['context'];

    var buttons = "";
    if (o.user !== null) buttons += '<div id="fedmenu-user-button" class="fedmenu-button"><div class="img"></div></div>';
    if (o.package !== null) buttons += '<div id="fedmenu-package-button" class="fedmenu-button"><div class="img"></div></div>';
    buttons += '<div id="fedmenu-main-button" class="fedmenu-button"><div class="img"></div></div>';

    var script = $("script[src$='fedmenu.js']").attr('src');
    var base = script.slice(0, -13);

    $('body', c).append('<link href="' + base + 'css/fedmenu.css" rel="stylesheet">');
    $('body', c).append(
        '<div id="fedmenu-tray" class="fedmenu-' + o.position + '">' +
        buttons + '</div>');

    $('body', c).append('<div id="fedmenu-wrapper"></div>');

    $('body', c).append('<div id="fedmenu-main-content" class="fedmenu-content"></div>');
    $('#fedmenu-main-content', c).append("<span class='fedmenu-exit'>&#x274C;</span>");
    $('#fedmenu-main-content', c).append("<h1>Fedora Infrastructure Apps</h1>");

    var imgurl;
    if (o.user !== null) {
        imgurl = libravatar.url(o.user);
        $('#fedmenu-user-button .img', c).css('background-image', 'url("' + imgurl + '")');
        $('body', c).append('<div id="fedmenu-user-content" class="fedmenu-content"></div>');
        $('#fedmenu-user-content', c).append("<span class='fedmenu-exit'>&#x274C;</span>");
        $('#fedmenu-user-content', c).append("<h1>View " + o.user + " in other apps</h1>");
    }
    if (o.package !== null) {
        /* This icon is not always going to exist, so we should put in an
         * apache rule that redirects to a default icon if this file
         * isn't there. */
        imgurl = 'https://apps.fedoraproject.org/packages/images/icons/' + o.package + '.png';
        $('#fedmenu-package-button .img', c).css('background-image', 'url("' + imgurl + '")');
        $('body', c).append('<div id="fedmenu-package-content" class="fedmenu-content"></div>');
        $('#fedmenu-package-content', c).append("<span class='fedmenu-exit'>&#x274C;</span>");
        $('#fedmenu-package-content', c).append("<h1>View the " + o.package + " package elsewhere</h1>");
    }

    // Define three functions used to generate the content of the menu panes
    var make_main_content_html = function(i, node) {
        var html = "<div class='fedmenu-panel'><div class='fedmenu-header'>" +
            node.name + "</div><ul>";

        $.each(node.children, function(j, leaf) {
            html = html +
                "<li><a target='_blank' href='" + leaf.data.url + "'>" +
                $("<p>" + leaf.name + "</p>").text() +
                "</a></li>";
        });
        html = html + "</ul></div>";
        $("#fedmenu-main-content", c).append(html);
    };

    var make_user_content_html = function(i, node) {
        var html = "<div class='fedmenu-panel'><div class='fedmenu-header'>" +
            node.name + "</div><ul>";

        var found = false;
        $.each(node.children, function(j, leaf) {
            if (leaf.data.user_url !== undefined) {
                found = true;
                var url = leaf.data.user_url.replace('{user}', o.user);
                html = html +
                    "<li><a target='_blank' href='" + url + "'>" +
                    $("<p>" + leaf.name + "</p>").text() +
                    "</a></li>";
            }
        });
        if (found) {
            html = html + "</ul></div>";
            $("#fedmenu-user-content", c).append(html);
        }
    };

    var make_package_content_html = function(i, node) {
        var html = "<div class='fedmenu-panel'><div class='fedmenu-header'>" +
            node.name + "</div><ul>";

        var found = false;
        $.each(node.children, function(j, leaf) {
            if (leaf.data.package_url !== undefined) {
                found = true;
                var url = leaf.data.package_url.replace('{package}', o.package);
                html = html +
                    "<li><a target='_blank' href='" + url + "'>" +
                    $("<p>" + leaf.name + "</p>").text() +
                    "</a></li>";
            }
        });
        if (found) {
            html = html + "</ul></div>";
            $("#fedmenu-package-content", c).append(html);
        }
    };

    $.ajax({
        url: o.url,
        mimeType: o.mimeType,
        dataType: 'script',
        cache: true,
        error: function(err) {
            console.log('Error getting ' + o.url);
            console.log(err);
        },
        success: function(script) {
            $.each(json.children, make_main_content_html);
            if (o.user !== null)
                $.each(json.children, make_user_content_html);
            if (o.package !== null)
                $.each(json.children, make_package_content_html);
        },
    });

    var selector = function(t) {
        return "#fedmenu-wrapper," +
            "#fedmenu-" + t + "-button," +
            "#fedmenu-" + t + "-content";
    };
    var activate = function(t) { $(selector(t), c).addClass('fedmenu-active'); };
    var deactivate = function(t) { $(selector(t), c).removeClass('fedmenu-active'); };

    var click_factory = function(t) { return function() {
        if ($(this).hasClass('fedmenu-active')) {
            deactivate(t);
        } else {
            // Deactivate any others that may be active before starting anew.
            deactivate('main'); deactivate('user'); deactivate('package');
            activate(t);
        }
    };};
    $("#fedmenu-main-button", c).click(click_factory('main'));
    $("#fedmenu-user-button", c).click(click_factory('user'));
    $("#fedmenu-package-button", c).click(click_factory('package'));
    $("#fedmenu-wrapper,.fedmenu-exit", c).click(function() {
        deactivate('main');
        deactivate('user');
        deactivate('package');
    });
    $(document).keydown(function(event) {
        if (event.key == 'Esc'){
            deactivate('main');
            deactivate('user');
            deactivate('package');
        }
    });
}); };
