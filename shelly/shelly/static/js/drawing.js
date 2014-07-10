(function() {
    'use strict';

    // ---Plotly global modules
    /* global Plotly:false */

    // ---external global dependencies
    /* global d3:false, tinycolor:false */

    var drawing = Plotly.Drawing = {};
    // -----------------------------------------------------
    // styling functions for plot elements
    // -----------------------------------------------------

    drawing.rgb = function(cstr) {
        var c = tinycolor(cstr).toRgb();
        return 'rgb(' + Math.round(c.r) + ', ' +
            Math.round(c.g) + ', ' + Math.round(c.b) + ')';
    };

    drawing.opacity = function(cstr) { return tinycolor(cstr).alpha; };

    drawing.addOpacity = function(cstr,op) {
        var c = tinycolor(cstr).toRgb();
        return 'rgba(' + Math.round(c.r) + ', ' +
            Math.round(c.g) + ', ' + Math.round(c.b) + ', ' + op + ')';
    };

    drawing.strokeColor = function(s,c) {
        s.style({'stroke':drawing.rgb(c), 'stroke-opacity':drawing.opacity(c)});
    };

    drawing.fillColor = function(s,c) {
        s.style({'fill':drawing.rgb(c), 'fill-opacity':drawing.opacity(c)});
    };

    drawing.font = function(s,family,size,fill) {
        if(family!==undefined) { s.style('font-family',family); }
        if(size!==undefined) { s.style('font-size',size+'px'); }
        if(fill!==undefined) { s.call(drawing.fillColor,fill); }
    };

    drawing.setPosition = function(s,x,y) { s.attr('x',x).attr('y',y); };
    drawing.setSize = function(s,w,h) { s.attr('width',w).attr('height',h); };
    drawing.setRect = function(s,x,y,w,h) {
        s.call(drawing.setPosition,x,y).call(drawing.setSize,w,h);
    };

    drawing.translatePoints = function(s,xa,ya){
        s.each(function(d){
            // put xp and yp into d if pixel scaling is already done
            var x = d.xp || xa.c2p(d.x),
                y = d.yp || ya.c2p(d.y),
                p = d3.select(this);
            if($.isNumeric(x) && $.isNumeric(y)) {
                // for multiline text this works better
                if(this.nodeName==='text') { p.attr('x',x).attr('y',y); }
                else { p.attr('transform','translate('+x+','+y+')'); }
            }
            else { p.remove(); }
        });
    };

    drawing.getPx = function(s,styleAttr) {
        // helper to pull out a px value from a style that may contain px units
        // s is a d3 selection (will pull from the first one)
        return Number(s.style(styleAttr).replace(/px$/,''));
    };

    drawing.lineGroupStyle = function(s,lw,lc,ld) {
        s.style('fill','none')
        .each(function(d){
            var lw1 = lw||(d&&d[0]&&d[0].t&&d[0].t.lw)||0,
                da = ld||(d&&d[0]&&d[0].t&&d[0].t.ld),
                dlw = Math.max(lw1,3);
            if(da==='solid') { da = ''; }
            else if(da==='dot') { da = dlw+'px,'+dlw+'px'; }
            else if(da==='dash') { da = (3*dlw)+'px,'+(3*dlw)+'px'; }
            else if(da==='longdash') { da = (5*dlw)+'px,'+(5*dlw)+'px'; }
            else if(da==='dashdot') {
                da = (3*dlw)+'px,'+dlw+'px,'+dlw+'px,'+dlw+'px';
            }
            else if(da==='longdashdot') {
                da = (5*dlw)+'px,'+(2*dlw)+'px,'+dlw+'px,'+(2*dlw)+'px';
            }
            // otherwise user wrote the dasharray themselves - leave it be

            d3.select(this)
                .call(drawing.strokeColor,lc||(d&&d[0]&&d[0].t&&d[0].t.lc))
                .style('stroke-dasharray',da)
                .style('stroke-width',lw1+'px');
        });
    };

    drawing.fillGroupStyle = function(s) {
        s.style('stroke-width',0)
        .each(function(d){
            var shape = d3.select(this);
            try {
                shape.call(drawing.fillColor,d[0].t.fc);
            }
            catch(e) {
                console.log(e,s);
                shape.remove();
            }
        });
    };

    // marker symbol definitions
    // users can specify markers either by number or name
    // add 100 (or '-open') and you get an open marker
    //  open markers have no fill and use line color as the stroke color
    // add 200 (or '-dot') and you get a dot in the middle
    // add both and you get both
    var SYMBOLDEFS = {
        circle: {
            n: 0,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M'+rs+',0A'+rs+','+rs+' 0 1,1 0,-'+rs+
                    'A'+rs+','+rs+' 0 0,1 '+rs+',0Z';
            }
        },
        square: {
            n: 1,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M'+rs+','+rs+'H-'+rs+'V-'+rs+'H'+rs+'Z';
            }
        },
        diamond: {
            n: 2,
            f: function(r) {
                var rd = d3.round(r*1.3,2);
                return 'M'+rd+',0L0,'+rd+'L-'+rd+',0L0,-'+rd+'Z';
            }
        },
        cross: {
            n: 3,
            f: function(r) {
                var rc = d3.round(r*0.4,2),
                    rc2 = d3.round(r*1.2,2);
                return 'M'+rc2+','+rc+'H'+rc+'V'+rc2+'H-'+rc+
                    'V'+rc+'H-'+rc2+'V-'+rc+'H-'+rc+'V-'+rc2+
                    'H'+rc+'V-'+rc+'H'+rc2+'Z';
            }
        },
        x: {
            n: 4,
            f: function(r) {
                var rx = d3.round(r*0.8/Math.sqrt(2),2),
                    ne = 'l'+rx+','+rx,
                    se = 'l'+rx+',-'+rx,
                    sw = 'l-'+rx+',-'+rx,
                    nw = 'l-'+rx+','+rx;
                return 'M0,'+rx+ne+se+sw+se+sw+nw+sw+nw+ne+nw+ne+'Z';
            }
        },
        'triangle-up': {
            n: 5,
            f: function(r) {
                var rt = d3.round(r*2/Math.sqrt(3),2),
                    r2 = d3.round(r/2,2),
                    rs = d3.round(r,2);
                return 'M-'+rt+','+r2+'H'+rt+'L0,-'+rs+'Z';
            }
        },
        'triangle-down': {
            n: 6,
            f: function(r) {
                var rt = d3.round(r*2/Math.sqrt(3),2),
                    r2 = d3.round(r/2,2),
                    rs = d3.round(r,2);
                return 'M-'+rt+',-'+r2+'H'+rt+'L0,'+rs+'Z';
            }
        },
        'triangle-left': {
            n: 7,
            f: function(r) {
                var rt = d3.round(r*2/Math.sqrt(3),2),
                    r2 = d3.round(r/2,2),
                    rs = d3.round(r,2);
                return 'M'+r2+',-'+rt+'V'+rt+'L-'+rs+',0Z';
            }
        },
        'triangle-right': {
            n: 8,
            f: function(r) {
                var rt = d3.round(r*2/Math.sqrt(3),2),
                    r2 = d3.round(r/2,2),
                    rs = d3.round(r,2);
                return 'M-'+r2+',-'+rt+'V'+rt+'L'+rs+',0Z';
            }
        },
        'triangle-ne': {
            n: 9,
            f: function(r) {
                var r1 = d3.round(r*0.6,2),
                    r2 = d3.round(r*1.2,2);
                return 'M-'+r2+',-'+r1+'H'+r1+'V'+r2+'Z';
            }
        },
        'triangle-se': {
            n: 10,
            f: function(r) {
                var r1 = d3.round(r*0.6,2),
                    r2 = d3.round(r*1.2,2);
                return 'M'+r1+',-'+r2+'V'+r1+'H-'+r2+'Z';
            }
        },
        'triangle-sw': {
            n: 11,
            f: function(r) {
                var r1 = d3.round(r*0.6,2),
                    r2 = d3.round(r*1.2,2);
                return 'M'+r2+','+r1+'H-'+r1+'V-'+r2+'Z';
            }
        },
        'triangle-nw': {
            n: 12,
            f: function(r) {
                var r1 = d3.round(r*0.6,2),
                    r2 = d3.round(r*1.2,2);
                return 'M-'+r1+','+r2+'V-'+r1+'H'+r2+'Z';
            }
        },
        pentagon: {
            n: 13,
            f: function(r) {
                var x1 = d3.round(r*0.951,2),
                    x2 = d3.round(r*0.588,2),
                    y0 = d3.round(-r,2),
                    y1 = d3.round(r*-0.309,2),
                    y2 = d3.round(r*0.809,2);
                return 'M'+x1+','+y1+'L'+x2+','+y2+'H-'+x2+
                    'L-'+x1+','+y1+'L0,'+y0+'Z';
            }
        },
        hexagon: {
            n: 14,
            f: function(r) {
                var y0 = d3.round(r,2),
                    y1 = d3.round(r/2,2),
                    x = d3.round(r*Math.sqrt(3)/2,2);
                return 'M'+x+',-'+y1+'V'+y1+'L0,'+y0+
                    'L-'+x+','+y1+'V-'+y1+'L0,-'+y0+'Z';
            }
        },
        hexagon2: {
            n: 15,
            f: function(r) {
                var x0 = d3.round(r,2),
                    x1 = d3.round(r/2,2),
                    y = d3.round(r*Math.sqrt(3)/2,2);
                return 'M-'+x1+','+y+'H'+x1+'L'+x0+
                    ',0L'+x1+',-'+y+'H-'+x1+'L-'+x0+',0Z';
            }
        },
        octagon: {
            n: 16,
            f: function(r) {
                var a = d3.round(r*0.924,2),
                    b = d3.round(r*0.383,2);
                return 'M-'+b+',-'+a+'H'+b+'L'+a+',-'+b+'V'+b+
                    'L'+b+','+a+'H-'+b+'L-'+a+','+b+'V-'+b+'Z';
            }
        },
        star: {
            n: 17,
            f: function(r) {
                var rs = r*1.4,
                    x1 = d3.round(rs*0.225,2),
                    x2 = d3.round(rs*0.951,2),
                    x3 = d3.round(rs*0.363,2),
                    x4 = d3.round(rs*0.588,2),
                    y0 = d3.round(-rs,2),
                    y1 = d3.round(rs*-0.309,2),
                    y3 = d3.round(rs*0.118,2),
                    y4 = d3.round(rs*0.809,2),
                    y5 = d3.round(rs*0.382,2);
                return 'M'+x1+','+y1+'H'+x2+'L'+x3+','+y3+
                    'L'+x4+','+y4+'L0,'+y5+'L-'+x4+','+y4+
                    'L-'+x3+','+y3+'L-'+x2+','+y1+'H-'+x1+
                    'L0,'+y0+'Z';
            }
        },
        hexagram: {
            n: 18,
            f: function(r) {
                var y = d3.round(r*0.66,2),
                    x1 = d3.round(r*0.38,2),
                    x2 = d3.round(r*0.76,2);
                return 'M-'+x2+',0l-'+x1+',-'+y+'h'+x2+
                    'l'+x1+',-'+y+'l'+x1+','+y+'h'+x2+
                    'l-'+x1+','+y+'l'+x1+','+y+'h-'+x2+
                    'l-'+x1+','+y+'l-'+x1+',-'+y+'h-'+x2+'Z';
            }
        },
        'star-triangle-up': {
            n: 19,
            f: function(r) {
                var x = d3.round(r*Math.sqrt(3)*0.8,2),
                    y1 = d3.round(r*0.8,2),
                    y2 = d3.round(r*1.6,2),
                    rc = d3.round(r*4,2),
                    aPart = 'A '+rc+','+rc+' 0 0 1 ';
                return 'M-'+x+','+y1+aPart+x+','+y1+
                    aPart+'0,-'+y2+aPart+'-'+x+','+y1+'Z';
            }
        },
        'star-triangle-down': {
            n: 20,
            f: function(r) {
                var x = d3.round(r*Math.sqrt(3)*0.8,2),
                    y1 = d3.round(r*0.8,2),
                    y2 = d3.round(r*1.6,2),
                    rc = d3.round(r*4,2),
                    aPart = 'A '+rc+','+rc+' 0 0 1 ';
                return 'M'+x+',-'+y1+aPart+'-'+x+',-'+y1+
                    aPart+'0,'+y2+aPart+x+',-'+y1+'Z';
            }
        },
        'star-square': {
            n: 21,
            f: function(r) {
                var rp = d3.round(r*1.1,2),
                    rc = d3.round(r*2,2),
                    aPart = 'A '+rc+','+rc+' 0 0 1 ';
                return 'M-'+rp+',-'+rp+aPart+'-'+rp+','+rp+
                    aPart+rp+','+rp+aPart+rp+',-'+rp+
                    aPart+'-'+rp+',-'+rp+'Z';
            }
        },
        'star-diamond': {
            n: 22,
            f: function(r) {
                var rp = d3.round(r*1.4,2),
                    rc = d3.round(r*1.9,2),
                    aPart = 'A '+rc+','+rc+' 0 0 1 ';
                return 'M-'+rp+',0'+aPart+'0,'+rp+
                    aPart+rp+',0'+aPart+'0,-'+rp+
                    aPart+'-'+rp+',0'+'Z';
            }
        },
        'diamond-tall': {
            n: 23,
            f: function(r) {
                var x = d3.round(r*0.7,2),
                    y = d3.round(r*1.4,2);
                return 'M0,'+y+'L'+x+',0L0,-'+y+'L-'+x+',0Z';
            }
        },
        'diamond-wide': {
            n: 24,
            f: function(r) {
                var x = d3.round(r*1.4,2),
                    y = d3.round(r*0.7,2);
                return 'M0,'+y+'L'+x+',0L0,-'+y+'L-'+x+',0Z';
            }
        },
        hourglass: {
            n: 25,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M'+rs+','+rs+'H-'+rs+'L'+rs+',-'+rs+'H-'+rs+'Z';
            },
            noDot: true
        },
        bowtie: {
            n: 26,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M'+rs+','+rs+'V-'+rs+'L-'+rs+','+rs+'V-'+rs+'Z';
            },
            noDot: true
        },
        'circle-cross': {
            n: 27,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M0,'+rs+'V-'+rs+'M'+rs+',0H-'+rs+
                    'M'+rs+',0A'+rs+','+rs+' 0 1,1 0,-'+rs+
                    'A'+rs+','+rs+' 0 0,1 '+rs+',0Z';
            },
            needLine: true,
            noDot: true
        },
        'circle-x': {
            n: 28,
            f: function(r) {
                var rs = d3.round(r,2),
                    rc = d3.round(r/Math.sqrt(2),2);
                return 'M'+rc+','+rc+'L-'+rc+',-'+rc+
                    'M'+rc+',-'+rc+'L-'+rc+','+rc+
                    'M'+rs+',0A'+rs+','+rs+' 0 1,1 0,-'+rs+
                    'A'+rs+','+rs+' 0 0,1 '+rs+',0Z';
            },
            needLine: true,
            noDot: true
        },
        'square-cross': {
            n: 29,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M0,'+rs+'V-'+rs+'M'+rs+',0H-'+rs+
                    'M'+rs+','+rs+'H-'+rs+'V-'+rs+'H'+rs+'Z';
            },
            needLine: true,
            noDot: true
        },
        'square-x': {
            n: 30,
            f: function(r) {
                var rs = d3.round(r,2);
                return 'M'+rs+','+rs+'L-'+rs+',-'+rs+
                    'M'+rs+',-'+rs+'L-'+rs+','+rs+
                    'M'+rs+','+rs+'H-'+rs+'V-'+rs+'H'+rs+'Z';
            },
            needLine: true,
            noDot: true
        },
        'diamond-cross': {
            n: 31,
            f: function(r) {
                var rd = d3.round(r*1.3,2);
                return 'M'+rd+',0L0,'+rd+'L-'+rd+',0L0,-'+rd+'Z'+
                    'M0,-'+rd+'V'+rd+'M-'+rd+',0H'+rd;
            },
            needLine: true,
            noDot: true
        },
        'diamond-x': {
            n: 32,
            f: function(r) {
                var rd = d3.round(r*1.3,2),
                    r2 = d3.round(r*0.65,2);
                return 'M'+rd+',0L0,'+rd+'L-'+rd+',0L0,-'+rd+'Z'+
                    'M-'+r2+',-'+r2+'L'+r2+','+r2+
                    'M-'+r2+','+r2+'L'+r2+',-'+r2;
            },
            needLine: true,
            noDot: true
        },
        'cross-thin': {
            n: 33,
            f: function(r) {
                var rc = d3.round(r*1.4,2);
                return 'M0,'+rc+'V-'+rc+'M'+rc+',0H-'+rc;
            },
            needLine: true,
            noDot: true
        },
        'x-thin': {
            n: 34,
            f: function(r) {
                var rx = d3.round(r,2);
                return 'M'+rx+','+rx+'L-'+rx+',-'+rx+
                    'M'+rx+',-'+rx+'L-'+rx+','+rx;
            },
            needLine: true,
            noDot: true
        },
        asterisk: {
            n: 35,
            f: function(r) {
                var rc = d3.round(r*1.2,2);
                var rs = d3.round(r*0.85,2);
                return 'M0,'+rc+'V-'+rc+'M'+rc+',0H-'+rc+
                    'M'+rs+','+rs+'L-'+rs+',-'+rs+
                    'M'+rs+',-'+rs+'L-'+rs+','+rs;
            },
            needLine: true,
            noDot: true
        },
        hash: {
            n: 36,
            f: function(r) {
                var r1 = d3.round(r/2,2),
                    r2 = d3.round(r,2);
                return 'M'+r1+','+r2+'V-'+r2+
                    'm-'+r2+',0V'+r2+
                    'M'+r2+','+r1+'H-'+r2+
                    'm0,-'+r2+'H'+r2;
            },
            needLine: true
        },
        'y-up': {
            n: 37,
            f: function(r) {
                var x = d3.round(r*1.2,2),
                    y0 = d3.round(r*1.6,2),
                    y1 = d3.round(r*0.8,2);
                return 'M-'+x+','+y1+'L0,0M'+x+','+y1+'L0,0M0,-'+y0+'L0,0';
            },
            needLine: true,
            noDot: true
        },
        'y-down': {
            n: 38,
            f: function(r) {
                var x = d3.round(r*1.2,2),
                    y0 = d3.round(r*1.6,2),
                    y1 = d3.round(r*0.8,2);
                return 'M-'+x+',-'+y1+'L0,0M'+x+',-'+y1+'L0,0M0,'+y0+'L0,0';
            },
            needLine: true,
            noDot: true
        },
        'y-left': {
            n: 39,
            f: function(r) {
                var y = d3.round(r*1.2,2),
                    x0 = d3.round(r*1.6,2),
                    x1 = d3.round(r*0.8,2);
                return 'M'+x1+','+y+'L0,0M'+x1+',-'+y+'L0,0M-'+x0+',0L0,0';
            },
            needLine: true,
            noDot: true
        },
        'y-right': {
            n: 40,
            f: function(r) {
                var y = d3.round(r*1.2,2),
                    x0 = d3.round(r*1.6,2),
                    x1 = d3.round(r*0.8,2);
                return 'M-'+x1+','+y+'L0,0M-'+x1+',-'+y+'L0,0M'+x0+',0L0,0';
            },
            needLine: true,
            noDot: true
        },
        'line-ew': {
            n: 41,
            f: function(r) {
                var rc = d3.round(r*1.4,2);
                return 'M'+rc+',0H-'+rc;
            },
            needLine: true,
            noDot: true
        },
        'line-ns': {
            n: 42,
            f: function(r) {
                var rc = d3.round(r*1.4,2);
                return 'M0,'+rc+'V-'+rc;
            },
            needLine: true,
            noDot: true
        },
        'line-ne': {
            n: 43,
            f: function(r) {
                var rx = d3.round(r,2);
                return 'M'+rx+',-'+rx+'L-'+rx+','+rx;
            },
            needLine: true,
            noDot: true
        },
        'line-nw': {
            n: 44,
            f: function(r) {
                var rx = d3.round(r,2);
                return 'M'+rx+','+rx+'L-'+rx+',-'+rx;
            },
            needLine: true,
            noDot: true
        },
    };

    drawing.symbolNames = [];
    drawing.symbolFuncs = [];
    drawing.symbolNeedLines = {};
    drawing.symbolNoDot = {};
    Object.keys(SYMBOLDEFS).forEach(function(k) {
        var symDef = SYMBOLDEFS[k];
        drawing.symbolNames[symDef.n] = k;
        drawing.symbolFuncs[symDef.n] = symDef.f;
        if(symDef.needLine) {
            drawing.symbolNeedLines[symDef.n] = true;
        }
        if(symDef.noDot) {
            drawing.symbolNoDot[symDef.n] = true;
        }
    });
    var MAXSYMBOL = drawing.symbolNames.length,
        // add a dot in the middle of the symbol
        DOTPATH = 'M0,0.5L0.5,0L0,-0.5L-0.5,0Z';

    drawing.symbolNumber = function(v) {
        if(typeof v === 'string') {
            var vbase = 0;
            if(v.indexOf('-open') > 0) {
                vbase = 100;
                v = v.replace('-open','');
            }
            if(v.indexOf('-dot') > 0) {
                vbase += 200;
                v = v.replace('-dot','');
            }
            v = drawing.symbolNames.indexOf(v);
            if(v>=0) { v += vbase; }
        }
        if((v%100 >= MAXSYMBOL) || v>=400) { return 0; }
        return Math.floor(Math.max(v,0));
    };

    drawing.pointStyle = function(s,t) {
        // only scatter & box plots get marker path and opacity
        // bars, histograms don't
        if(['scatter','box'].indexOf(t.type)!==-1) {
            var r,
                // for bubble charts, allow scaling the provided value linearly
                // and by area or diameter.
                // Note this only applies to the array-value sizes
                sizeRef = t.msr || 1,
                sizeFn = (t.msm==='area') ?
                    function(v){ return Math.sqrt(v/sizeRef); } :
                    function(v){ return v/sizeRef; };
            s.attr('d',function(d){
                if(d.ms+1) { r = sizeFn(d.ms/2); }
                else { r = ((t.ms+1 || (d.t ? d.t.ms : 0)+1)-1)/2; }

                // store the calculated size so hover can use it
                d.mrc = r;

                // in case of "various" etc... set a visible default
                if(!$.isNumeric(r) || r<0) { r=3; }

                // turn the symbol into a sanitized number
                var x = drawing.symbolNumber(
                            d.mx || t.mx || (d.t ? d.t.mx : '')),
                    xBase = x%100;

                // save if this marker is open
                // because that impacts how to handle colors
                d.om = x%200 >= 100;

                return drawing.symbolFuncs[xBase](r) +
                    (x >= 200 ? DOTPATH : '');
            })
            .style('opacity',function(d){
                return (d.mo+1 || t.mo+1 || (d.t ? d.t.mo : 0) +1) - 1;
            });
        }
        // allow array marker and marker line colors to be
        // scaled by given max and min to colorscales
        var colorscales = {
            m: drawing.tryColorscale(s,t,'m'),
            ml: drawing.tryColorscale(s,t,'ml'),
            so: drawing.tryColorscale(s,t,'so'),
            sol: drawing.tryColorscale(s,t,'sol')
        };
        s.each(function(d){
            // 'so' is suspected outliers, for box plots
            var a = (d.so) ? 'so' : 'm',
                lw = a+'lw', c = a+'c', lc = a+'lc',
                w = (d[lw]+1 || t[lw]+1 || (d.t ? d.t[lw] : 0)+1) - 1,
                p = d3.select(this),
                cc,lcc;
            if(d[c]) { d[c+'c'] = cc = colorscales[a](d[c]); }
            else { cc = t[c] || (d.t ? d.t[c] : ''); }
            if(d.om) {
                // open markers can't have zero linewidth, default to 1px,
                // and use fill color as stroke color
                if(!w) { w = 1; }
                p.call(drawing.strokeColor, cc)
                    .style({
                        'stroke-width': w+'px',
                        fill: 'none'
                    });
            }
            else {
                p.style('stroke-width',w+'px')
                    .call(drawing.fillColor, cc);
                if(w) {
                    if(d[lc]) { d[lc+'c'] = lcc = colorscales[a+'l'](d[lc]); }
                    else { lcc = t[lc] || (d.t ? d.t[lc] : ''); }
                    p.call(drawing.strokeColor, lcc);
                }
            }
        });
    };

    // for a given color attribute (ie m -> mc = marker.color) look to see if we
    // have a colorscale for it (ie mscl, mcmin, mcmax) - if we do, translate
    // all numeric color values according to that scale
    drawing.tryColorscale = function(s,t,attr) {
        if((attr+'scl') in t && (attr+'cmin') in t && (attr+'cmax') in t) {
            var scl = t[attr+'scl'],
                min = t[attr+'cmin'],
                max = t[attr+'cmax'],
                auto = t[attr+'cauto'];
            if(typeof scl === 'string' && scl in Plotly.colorscales) {
                scl = Plotly.colorscales[scl];
            }
            else if(!scl) {
                scl = Plotly.defaultColorscale;
            }

            // autoscale the colors - put the results back into t
            // (which is in calcdata)
            if(auto || !$.isNumeric(min) || !$.isNumeric(max)) {
                min = max = null;
                s.each(function(d){
                    var v = d[attr+'c'];
                    if($.isNumeric(v)) {
                        if(min===null || min>v) { min = v; }
                        if(max===null || max<v) { max = v; }
                    }
                });
                t[attr+'cmin'] = min;
                t[attr+'cmax'] = max;
            }

            var d = scl.map(function(si){ return min + si[0]*(max-min); }),
                r = scl.map(function(si){ return si[1]; }),
                sclfunc = d3.scale.linear()
                    .domain(d)
                    .interpolate(d3.interpolateRgb)
                    .range(r);
            return function(v){ return $.isNumeric(v) ? sclfunc(v) : v; };
        }
        else { return Plotly.Lib.identity; }
    };

    // draw text at points
    var TEXTOFFSETSIGN = {start:1,end:-1,middle:0,bottom:1,top:-1},
        LINEEXPAND = 1.3;
    drawing.textPointStyle = function(s,t) {
        s.each(function(d){
            var p = d3.select(this);
            if(!d.tx) { p.remove(); return; }
            var pos = d.tp || t.tp || (d.t ? d.t.tp : ''),
                v = pos.indexOf('top')!==-1 ? 'top' :
                    pos.indexOf('bottom')!==-1 ? 'bottom' : 'middle',
                h = pos.indexOf('left')!==-1 ? 'end' :
                    pos.indexOf('right')!==-1 ? 'start' : 'middle',
                fontSize = d.ts || t.ts || (d.t ? d.t.tf : ''),
                // if markers are shown, offset a little more than
                // the nominal marker size
                // ie 2/1.6 * nominal, bcs some markers are a bit bigger
                r=t.mode.indexOf('markers')===-1 ? 0 :
                    (((d.ms+1 || t.ms+1 || (d.t ? d.t.ms : 0)+1)-1)/1.6+1);
            p.style('opacity', (d.mo+1 || t.mo+1 || (d.t ? d.t.mo : 0) +1) - 1)
                .call(drawing.font,
                    d.tf || t.tf || (d.t ? d.t.tf : ''),
                    fontSize,
                    d.tc || t.tc || (d.t ? d.t.tc : ''))
                .attr('text-anchor',h)
                .text(d.tx)
                .call(Plotly.util.convertToTspans);
            var pgroup = d3.select(this.parentNode),
                tspans = p.selectAll('tspan.line'),
                numLines = ((tspans[0].length||1)-1)*LINEEXPAND+1,
                dx = TEXTOFFSETSIGN[h]*r,
                dy = fontSize*0.75 + TEXTOFFSETSIGN[v]*r +
                    (TEXTOFFSETSIGN[v]-1)*numLines*fontSize/2;

            // fix the overall text group position
            pgroup.attr('transform','translate('+dx+','+dy+')');

            // then fix multiline text
            if(numLines>1) {
                tspans.attr({ x: p.attr('x'), y: p.attr('y') });
            }
        });
    };

    // generalized Catmull-Rom splines, per
    // http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
    var CatmullRomExp = 0.5;
    drawing.smoothopen = function(pts,smoothness) {
        if(pts.length<3) { return 'M' + pts.join('L');}
        var path = 'M'+pts[0],
            tangents = [], i;
        for(i=1; i<pts.length-1; i++) {
            tangents.push(makeTangent(pts[i-1], pts[i], pts[i+1], smoothness));
        }
        path += 'Q'+tangents[0][0]+' '+pts[1];
        for(i=2; i<pts.length-1; i++) {
            path += 'C'+tangents[i-2][1]+' '+tangents[i-1][0]+' '+pts[i];
        }
        path += 'Q'+tangents[pts.length-3][1]+' '+pts[pts.length-1];
        return path;
    };

    drawing.smoothclosed = function(pts,smoothness) {
        if(pts.length<3) { return 'M' + pts.join('L') + 'Z'; }
        var path = 'M'+pts[0],
            pLast = pts.length-1,
            tangents = [makeTangent(pts[pLast],
                            pts[0], pts[1], smoothness)],
            i;
        for(i=1; i<pLast; i++) {
            tangents.push(makeTangent(pts[i-1], pts[i], pts[i+1], smoothness));
        }
        tangents.push(
            makeTangent(pts[pLast-1], pts[pLast], pts[0], smoothness)
        );

        for(i=1; i<=pLast; i++) {
            path += 'C'+tangents[i-1][1]+' '+tangents[i][0]+' '+pts[i];
        }
        path += 'C'+tangents[pLast][1]+' '+tangents[0][0]+' '+pts[0] + 'Z';
        return path;
    };

    function makeTangent(prevpt,thispt,nextpt,smoothness) {
        var d1x = prevpt[0]-thispt[0],
            d1y = prevpt[1]-thispt[1],
            d2x = nextpt[0]-thispt[0],
            d2y = nextpt[1]-thispt[1],
            d1a = Math.pow(d1x*d1x + d1y*d1y, CatmullRomExp/2),
            d2a = Math.pow(d2x*d2x + d2y*d2y, CatmullRomExp/2),
            numx = (d2a*d2a*d1x - d1a*d1a*d2x)*smoothness,
            numy = (d2a*d2a*d1y - d1a*d1a*d2y)*smoothness,
            denom1 = 3*d2a*(d1a+d2a),
            denom2 = 3*d1a*(d1a+d2a);
        return [
            [
                d3.round(thispt[0]+(denom1 && numx/denom1),2),
                d3.round(thispt[1]+(denom1 && numy/denom1),2)
            ],[
                d3.round(thispt[0]-(denom2 && numx/denom2),2),
                d3.round(thispt[1]-(denom2 && numy/denom2),2)
            ]
        ];
    }

    // step paths - returns a generator function for paths
    // with the given step shape
    var STEPPATH = {
        hv: function(p0,p1) {
            return 'H'+d3.round(p1[0],2)+'V'+d3.round(p1[1],2);
        },
        vh: function(p0,p1) {
            return 'V'+d3.round(p1[1],2)+'H'+d3.round(p1[0],2);
        },
        hvh: function(p0,p1) {
            return 'H'+d3.round((p0[0]+p1[0])/2,2)+'V'+
                d3.round(p1[1],2)+'H'+d3.round(p1[0],2);
        },
        vhv: function(p0,p1) {
            return 'V'+d3.round((p0[1]+p1[1])/2,2)+'H'+
                d3.round(p1[0],2)+'V'+d3.round(p1[1],2);
        }
    };
    var STEPLINEAR = function(p0,p1) {
        return 'L'+d3.round(p1[0],2)+','+d3.round(p1[1],2);
    };
    drawing.steps = function(shape) {
        var onestep = STEPPATH[shape] || STEPLINEAR;
        return function(pts) {
            var path = 'M'+d3.round(pts[0][0],2)+','+d3.round(pts[0][1],2);
            for(var i=1; i<pts.length; i++) {
                path += onestep(pts[i-1],pts[i]);
            }
            return path;
        };
    };

    // use our offscreen tester to get a clientRect for an element,
    // in a reference frame where it isn't translated and its anchor
    // point is at (0,0)
    var savedBBoxes = [],
        maxSavedBBoxes = 10000;
    drawing.bBox = function(node) {
        // cache elements we've already measured so we don't have to
        // remeasure the same thing many times
        var saveNum = node.attributes['data-bb'];
        if(saveNum) {
            return savedBBoxes[saveNum.value];
        }

        var test3 = d3.select('#js-plotly-tester'),
            tester = test3.node();

        // copy the node to test into the tester
        var testNode = node.cloneNode(true);
        tester.appendChild(testNode);
        // standardize its position... do we really want to do this?
        d3.select(testNode).attr({x:0, y:0, transform:''});

        var testRect = testNode.getBoundingClientRect(),
            refRect = test3.select('.js-reference-point')
                .node().getBoundingClientRect();

        tester.removeChild(testNode);

        var bb = {
            height: testRect.height,
            width: testRect.width,
            left: testRect.left - refRect.left,
            top: testRect.top - refRect.top,
            right: testRect.right - refRect.left,
            bottom: testRect.bottom - refRect.top
        };

        // make sure we don't have too many saved boxes,
        // or a long session could overload on memory
        // by saving boxes for long-gone elements
        if(savedBBoxes.length>=maxSavedBBoxes) {
            $('[data-bb]').attr('data-bb',null);
            savedBBoxes = [];
        }

        // cache this bbox
        node.setAttribute('data-bb',savedBBoxes.length);
        savedBBoxes.push(bb);

        return bb;
    };

}()); // end Drawing object definition