import fanstatic


library = fanstatic.Library('gocept.jsform', 'resources')


jsform = fanstatic.Resource(
    library, 'build.js', minified='build.min.js')
