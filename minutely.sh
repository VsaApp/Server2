#!/bin/bash
mkdir -p output output/vp output/vp/today output/vp/tomorrow output/cafetoria
timeout 5 node api/standalone/vp.js
timeout 5 node api/standalone/teacherVp.js
timeout 10 node api/standalone/cafetoria.js