#!/bin/bash
mkdir -p output output/vp output/vp/today output/vp/tomorrow
timeout 5 node api/standalone/vp.js
node api/standalone/teacherVp.js