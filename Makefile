existing_min_js_files = $(patsubst %.js,%.min.js, $(wildcard src/gocept/jsform/resources/src/*.min.js) $(wildcard src/gocept/jsform/additional/*.min.js))
min_js_files = $(filter-out $(existing_min_js_files), $(patsubst %.js,%.min.js, $(wildcard src/gocept/jsform/resources/src/*.js) $(wildcard src/gocept/jsform/additional/*.min.js)))

%.min.js: %.js
	./bin/py -m jsmin $<  > $@

all: $(min_js_files)

clean:
	rm -f $(min_js_files)
