/**
 * Let's Keep Swimming - Template Library
 *
 * Swim workout templates derived from Midmar Mile training programs.
 * These templates provide consistent, proven workout structures.
 *
 * Template sources:
 * - 6-week intermediate (1 mile focus)
 * - 9-week intermediate (progressive build)
 */

const TEMPLATES = {
  // ============================================
  // 6-WEEK INTERMEDIATE TEMPLATES
  // ============================================

  // Week 1-2: Foundation building
  '6w-interval-8x100': {
    id: '6w-interval-8x100',
    name: '8x100m Interval Foundation',
    source: '6-week',
    tags: ['interval', 'technique', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'moderate',
    base_distance_m: 1400,
    base_duration_min_est: 45,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy - long smooth strokes', distance_m: 100 },
          { text: '50m breaststroke - focus on glide phase', distance_m: 50 },
          { text: '50m backstroke - relaxed arm recovery', distance_m: 50 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '8x100m freestyle at moderate pace (aim for consistent splits), 20 sec rest between each', distance_m: 800, reps: 8, per_rep_m: 100, rest_sec: 20 }
        ]
      },
      {
        label: 'Technique drills',
        items: [
          { text: '2x50m catch-up drill (touch hands together before each stroke), 15 sec rest', distance_m: 100, reps: 2, per_rep_m: 50, rest_sec: 15 },
          { text: '2x50m fingertip drag (drag fingertips along water surface on recovery), 15 sec rest', distance_m: 100, reps: 2, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m easy breaststroke', distance_m: 100 },
          { text: '100m easy backstroke', distance_m: 100 }
        ]
      }
    ]
  },

  '6w-endurance-4x200': {
    id: '6w-endurance-4x200',
    name: '4x200m Endurance Builder',
    source: '6-week',
    tags: ['endurance', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'moderate',
    base_distance_m: 1400,
    base_duration_min_est: 45,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '150m freestyle easy - focus on exhaling underwater', distance_m: 150 },
          { text: '100m alternating: 25m breaststroke / 25m freestyle', distance_m: 100 },
          { text: '50m backstroke - long arm extension', distance_m: 50 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '4x200m freestyle steady pace (breathe every 3 strokes), 30 sec rest between each', distance_m: 800, reps: 4, per_rep_m: 200, rest_sec: 30 }
        ]
      },
      {
        label: 'Technique - Bilateral breathing',
        items: [
          { text: '4x50m freestyle breathing every 3 strokes (alternate sides), 15 sec rest', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m easy breaststroke - long glide between strokes', distance_m: 100 }
        ]
      }
    ]
  },

  '6w-continuous-1000': {
    id: '6w-continuous-1000',
    name: '1000m Continuous Build',
    source: '6-week',
    tags: ['endurance', 'long', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'easy',
    base_distance_m: 1400,
    base_duration_min_est: 45,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy - count strokes per length (aim for consistency)', distance_m: 100 },
          { text: '50m breaststroke - wide pull, strong kick', distance_m: 50 },
          { text: '50m backstroke - keep hips high', distance_m: 50 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '1000m continuous freestyle at easy/conversational pace - you should be able to talk if needed. Focus on rhythm and relaxed breathing.', distance_m: 1000 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m breaststroke - super easy, stretch out', distance_m: 100 },
          { text: '100m backstroke - relaxed arm circles', distance_m: 100 }
        ]
      }
    ]
  },

  // Week 3-4: Building intensity
  '6w-interval-10x100': {
    id: '6w-interval-10x100',
    name: '10x100m Interval Progression',
    source: '6-week',
    tags: ['interval', 'build'],
    phase_fit: ['BUILD', 'SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 1700,
    base_duration_min_est: 50,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '200m freestyle easy - build stroke length', distance_m: 200 },
          { text: '100m choice stroke (breaststroke or backstroke)', distance_m: 100 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '10x100m freestyle at moderate-hard pace, 15 sec rest. First 50m strong, second 50m hold pace.', distance_m: 1000, reps: 10, per_rep_m: 100, rest_sec: 15 }
        ]
      },
      {
        label: 'Kick set (with kickboard)',
        items: [
          { text: '4x50m flutter kick with kickboard - keep kick tight and fast, 15 sec rest', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m breaststroke easy', distance_m: 100 },
          { text: '100m backstroke easy', distance_m: 100 }
        ]
      }
    ]
  },

  '6w-pyramid-5x200': {
    id: '6w-pyramid-5x200',
    name: '5x200m Pyramid Build',
    source: '6-week',
    tags: ['endurance', 'interval', 'build'],
    phase_fit: ['BUILD', 'SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 1600,
    base_duration_min_est: 50,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '200m freestyle easy', distance_m: 200 },
          { text: '100m backstroke - focus on rotation', distance_m: 100 }
        ]
      },
      {
        label: 'Main set - Pyramid effort',
        items: [
          { text: '1st 200m freestyle EASY - find your rhythm', distance_m: 200 },
          { text: '2nd 200m freestyle MODERATE - pick up the pace slightly', distance_m: 200 },
          { text: '3rd 200m freestyle MODERATE-HARD - push it, this is the peak', distance_m: 200 },
          { text: '4th 200m freestyle MODERATE - bring it back down', distance_m: 200 },
          { text: '5th 200m freestyle EASY - finish smooth', distance_m: 200 },
          { text: '(25 sec rest between each 200m)', reps: 5, rest_sec: 25 }
        ]
      },
      {
        label: 'Open water sighting practice',
        items: [
          { text: '4x50m freestyle with head-up "Tarzan" stroke every 6 strokes (look forward like sighting a buoy), 15 sec rest', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m breaststroke - slow and stretchy', distance_m: 100 }
        ]
      }
    ]
  },

  // Week 5: Race-specific work
  '6w-race-specific-1500': {
    id: '6w-race-specific-1500',
    name: '1500m Race Simulation',
    source: '6-week',
    tags: ['race_specific', 'long', 'sharpen'],
    phase_fit: ['SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 1900,
    base_duration_min_est: 55,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy - loosen up', distance_m: 100 },
          { text: '50m breaststroke - open up shoulders', distance_m: 50 },
          { text: '50m freestyle with head-up sighting every 8 strokes', distance_m: 50 }
        ]
      },
      {
        label: 'Main set - Race simulation',
        items: [
          { text: '1500m continuous freestyle at your target race pace. Practice sighting by lifting head every 8-10 strokes. Start controlled, build into middle, hold strong to finish.', distance_m: 1500 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m backstroke - very easy, let heart rate come down', distance_m: 100 },
          { text: '100m breaststroke - stretch and recover', distance_m: 100 }
        ]
      }
    ]
  },

  '6w-interval-8x200': {
    id: '6w-interval-8x200',
    name: '8x200m Sustained Effort',
    source: '6-week',
    tags: ['interval', 'endurance', 'sharpen'],
    phase_fit: ['BUILD', 'SHARPEN'],
    intensity: 'hard',
    base_distance_m: 2100,
    base_duration_min_est: 60,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy', distance_m: 100 },
          { text: '100m freestyle moderate - build into it', distance_m: 100 },
          { text: '100m alternating 25m breaststroke / 25m backstroke', distance_m: 100 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '8x200m freestyle at moderate-hard sustained effort. Hold the same pace across all 8. Focus on strong catch and steady kick. 20 sec rest between each.', distance_m: 1600, reps: 8, per_rep_m: 200, rest_sec: 20 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m backstroke - slow and easy', distance_m: 100 },
          { text: '100m breaststroke - long glides', distance_m: 100 }
        ]
      }
    ]
  },

  '6w-descend-6x300': {
    id: '6w-descend-6x300',
    name: '6x300m Descending Set',
    source: '6-week',
    tags: ['interval', 'endurance', 'sharpen'],
    phase_fit: ['SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 2200,
    base_duration_min_est: 65,
    structure: [
      {
        label: 'Warm-up - Mixed strokes',
        items: [
          { text: '100m freestyle easy', distance_m: 100 },
          { text: '100m breaststroke - focus on wide pull, then snap kick together', distance_m: 100 },
          { text: '100m backstroke - rotate shoulders with each stroke', distance_m: 100 }
        ]
      },
      {
        label: 'Main set - Descending 300s',
        items: [
          { text: '6x300m freestyle DESCENDING (each 300m should be faster than the last): #1 easy, #2 easy-moderate, #3 moderate, #4 moderate-hard, #5 hard, #6 sprint finish! 30 sec rest between each.', distance_m: 1800, reps: 6, per_rep_m: 300, rest_sec: 30 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '50m breaststroke - very easy', distance_m: 50 },
          { text: '50m backstroke - float and recover', distance_m: 50 }
        ]
      }
    ]
  },

  // Week 6: Final prep / Taper
  '6w-race-distance-1609': {
    id: '6w-race-distance-1609',
    name: 'Mile Distance Practice',
    source: '6-week',
    tags: ['race_specific', 'long', 'taper'],
    phase_fit: ['SHARPEN', 'TAPER'],
    intensity: 'moderate',
    base_distance_m: 2000,
    base_duration_min_est: 55,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '200m easy with race-start simulation (10 strokes hard)', distance_m: 200 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '1609m (1 mile) at race effort, practice pacing', distance_m: 1609 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '200m very easy', distance_m: 200 }
        ]
      }
    ]
  },

  '6w-taper-sharpener': {
    id: '6w-taper-sharpener',
    name: 'Pre-Race Sharpener',
    source: '6-week',
    tags: ['taper', 'race_specific'],
    phase_fit: ['TAPER'],
    intensity: 'easy',
    base_distance_m: 1200,
    base_duration_min_est: 35,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '150m freestyle easy - smooth and relaxed', distance_m: 150 },
          { text: '100m breaststroke - open up shoulders and hips', distance_m: 100 },
          { text: '50m backstroke - easy arm circles', distance_m: 50 }
        ]
      },
      {
        label: 'Race pace practice',
        items: [
          { text: '4x100m freestyle at RACE PACE - this is the pace you want to hold on race day. Feel confident. 30 sec rest between each.', distance_m: 400, reps: 4, per_rep_m: 100, rest_sec: 30 }
        ]
      },
      {
        label: 'Recovery',
        items: [
          { text: '100m breaststroke - easy, let heart rate come down', distance_m: 100 },
          { text: '100m backstroke - easy, relaxed', distance_m: 100 }
        ]
      },
      {
        label: 'Race start practice',
        items: [
          { text: '4x50m RACE START SIMULATION: First 10 strokes HARD (like fighting for position at the start), then settle into race pace. 20 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 20 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m choice stroke - very easy, stay loose', distance_m: 100 }
        ]
      }
    ]
  },

  // ============================================
  // 9-WEEK INTERMEDIATE TEMPLATES
  // ============================================

  '9w-technique-drills': {
    id: '9w-technique-drills',
    name: 'Technique Focus Session',
    source: '9-week',
    tags: ['technique', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'easy',
    base_distance_m: 1200,
    base_duration_min_est: 40,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy - focus on smooth entry', distance_m: 100 },
          { text: '100m breaststroke - wide pull, frog kick', distance_m: 100 }
        ]
      },
      {
        label: 'Freestyle drills',
        items: [
          { text: '4x50m CATCH-UP DRILL: Touch hands together in front before starting next stroke. Focus on full extension. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 },
          { text: '4x50m FINGERTIP DRAG: Drag fingertips along water surface during arm recovery. Keeps elbows high. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Kick set (with kickboard)',
        items: [
          { text: '4x50m FLUTTER KICK with kickboard: Small, fast kicks from the hips (not knees). Keep ankles relaxed. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Pull set (with pull buoy)',
        items: [
          { text: '4x50m FREESTYLE PULL with pull buoy between thighs: Focus only on arm pull. High elbow catch, push water back. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Swim - Apply technique',
        items: [
          { text: '2x100m freestyle at moderate pace - apply the drills: long strokes, high elbows, steady kick. 20 sec rest.', distance_m: 200, reps: 2, per_rep_m: 100, rest_sec: 20 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m backstroke - very easy', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-endurance-blocks': {
    id: '9w-endurance-blocks',
    name: 'Endurance Block Training',
    source: '9-week',
    tags: ['endurance', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'moderate',
    base_distance_m: 1800,
    base_duration_min_est: 55,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '150m freestyle easy - smooth strokes', distance_m: 150 },
          { text: '100m backstroke - focus on steady rotation', distance_m: 100 },
          { text: '50m breaststroke - wide pull, snap kick together', distance_m: 50 }
        ]
      },
      {
        label: 'Main set - Endurance blocks',
        items: [
          { text: '3x400m freestyle at steady moderate pace. Break it into 100m chunks mentally. Stay relaxed, consistent stroke rate. 45 sec rest between each 400m.', distance_m: 1200, reps: 3, per_rep_m: 400, rest_sec: 45 }
        ]
      },
      {
        label: 'Open water sighting drill',
        items: [
          { text: '4x50m TARZAN DRILL: Swim freestyle with head up, looking forward (like sighting a buoy). Builds neck strength for open water. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '50m breaststroke - easy', distance_m: 50 },
          { text: '50m backstroke - easy', distance_m: 50 }
        ]
      }
    ]
  },

  '9w-negative-split': {
    id: '9w-negative-split',
    name: 'Negative Split Practice',
    source: '9-week',
    tags: ['endurance', 'race_specific', 'sharpen'],
    phase_fit: ['BUILD', 'SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 1600,
    base_duration_min_est: 50,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '300m easy progressive', distance_m: 300 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '2x600m negative split (second half faster than first), 60 seconds rest', distance_m: 1200, reps: 2, per_rep_m: 600, rest_sec: 60 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m easy', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-longer-steady': {
    id: '9w-longer-steady',
    name: 'Long Steady Swim',
    source: '9-week',
    tags: ['endurance', 'long', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'easy',
    base_distance_m: 2000,
    base_duration_min_est: 60,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy - loosen up', distance_m: 100 },
          { text: '50m breaststroke - stretch out chest and shoulders', distance_m: 50 },
          { text: '50m backstroke - easy rotation', distance_m: 50 }
        ]
      },
      {
        label: 'Main set - Long continuous swim',
        items: [
          { text: '1600m continuous freestyle at easy/steady pace. This simulates race distance. Practice sighting (lift head to look forward) every 10 strokes. Focus on consistent stroke rate and relaxed breathing. Break it mentally into 400m chunks.', distance_m: 1600 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m breaststroke - slow and easy', distance_m: 100 },
          { text: '100m backstroke - gentle kicks, relaxed arms', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-speed-touch': {
    id: '9w-speed-touch',
    name: 'Speed Touch Session',
    source: '9-week',
    tags: ['interval', 'sharpen'],
    phase_fit: ['SHARPEN'],
    intensity: 'hard',
    base_distance_m: 1500,
    base_duration_min_est: 45,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '200m freestyle easy', distance_m: 200 },
          { text: '100m alternating 25m breaststroke / 25m backstroke', distance_m: 100 },
          { text: '4x25m freestyle PICKUPS: Start easy, build to fast by end of each 25m. 10 sec rest.', distance_m: 100 }
        ]
      },
      {
        label: 'Sprint set',
        items: [
          { text: '8x50m freestyle SPRINTS - GO FAST! Max effort for each 50m. 30 sec rest between each to recover fully.', distance_m: 400, reps: 8, per_rep_m: 50, rest_sec: 30 }
        ]
      },
      {
        label: 'Recovery',
        items: [
          { text: '100m breaststroke - very easy, catch your breath', distance_m: 100 },
          { text: '100m backstroke - easy recovery', distance_m: 100 }
        ]
      },
      {
        label: 'Race pace set',
        items: [
          { text: '4x100m freestyle at race pace - this is your goal pace for the event. Strong but sustainable. 20 sec rest.', distance_m: 400, reps: 4, per_rep_m: 100, rest_sec: 20 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m choice stroke - very easy, shake out the arms', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-broken-mile': {
    id: '9w-broken-mile',
    name: 'Broken Mile',
    source: '9-week',
    tags: ['race_specific', 'sharpen'],
    phase_fit: ['SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 2000,
    base_duration_min_est: 55,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '300m easy', distance_m: 300 }
        ]
      },
      {
        label: 'Main set',
        items: [
          { text: '4x400m at race pace, 15 seconds rest (minimal recovery simulates continuous effort)', distance_m: 1600, reps: 4, per_rep_m: 400, rest_sec: 15 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m easy', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-mixed-intensity': {
    id: '9w-mixed-intensity',
    name: 'Mixed Intensity Session',
    source: '9-week',
    tags: ['interval', 'endurance', 'build'],
    phase_fit: ['BUILD', 'SHARPEN'],
    intensity: 'moderate',
    base_distance_m: 1700,
    base_duration_min_est: 50,
    structure: [
      {
        label: 'Warm-up - Mixed strokes',
        items: [
          { text: '100m freestyle easy', distance_m: 100 },
          { text: '50m backstroke - long strokes', distance_m: 50 },
          { text: '50m breaststroke - focus on timing (pull, breathe, kick, glide)', distance_m: 50 },
          { text: '50m butterfly arms only (kick optional) - if comfortable, or substitute freestyle', distance_m: 50 },
          { text: '50m freestyle easy', distance_m: 50 }
        ]
      },
      {
        label: 'Main set - Mixed intensity',
        items: [
          { text: '400m freestyle steady - find your cruise pace, breathe every 3 strokes', distance_m: 400 },
          { text: '4x100m freestyle moderate-hard - push the pace, 15 sec rest between each', distance_m: 400, reps: 4, per_rep_m: 100, rest_sec: 15 },
          { text: '400m freestyle steady - return to cruise pace, controlled effort', distance_m: 400 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m breaststroke - easy, stretch out', distance_m: 100 },
          { text: '100m backstroke - easy, relax shoulders', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-kick-pull-focus': {
    id: '9w-kick-pull-focus',
    name: 'Kick & Pull Development',
    source: '9-week',
    tags: ['technique', 'build'],
    phase_fit: ['BUILD'],
    intensity: 'moderate',
    base_distance_m: 1400,
    base_duration_min_est: 45,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle easy', distance_m: 100 },
          { text: '100m breaststroke - focus on timing', distance_m: 100 }
        ]
      },
      {
        label: 'Kick set (with kickboard)',
        items: [
          { text: '4x50m FLUTTER KICK (freestyle kick) with kickboard: Keep kicks small and fast, from hips not knees. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 },
          { text: '4x50m BREASTSTROKE KICK with kickboard: Wide frog kick, snap heels together, glide. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Pull set (with pull buoy)',
        items: [
          { text: '4x50m FREESTYLE PULL with pull buoy: Focus on high elbow catch, pulling water back towards hips. No kick. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 },
          { text: '4x50m BREASTSTROKE PULL with pull buoy: Wide outsweep, then powerful insweep. Keep elbows high. 15 sec rest.', distance_m: 200, reps: 4, per_rep_m: 50, rest_sec: 15 }
        ]
      },
      {
        label: 'Full stroke - Apply the work',
        items: [
          { text: '4x100m freestyle at moderate pace - feel the improved catch and kick. 20 sec rest.', distance_m: 400, reps: 4, per_rep_m: 100, rest_sec: 20 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m easy choice stroke', distance_m: 100 }
        ]
      }
    ]
  },

  '9w-taper-maintenance': {
    id: '9w-taper-maintenance',
    name: 'Taper Maintenance',
    source: '9-week',
    tags: ['taper', 'recovery'],
    phase_fit: ['TAPER'],
    intensity: 'easy',
    base_distance_m: 1000,
    base_duration_min_est: 30,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle very easy - gentle start', distance_m: 100 },
          { text: '50m breaststroke - stretch it out', distance_m: 50 },
          { text: '50m backstroke - relaxed arm circles', distance_m: 50 }
        ]
      },
      {
        label: 'Main set - Stay sharp',
        items: [
          { text: '4x100m freestyle at moderate pace - keep the feel for the water, dont push too hard. 30 sec rest.', distance_m: 400, reps: 4, per_rep_m: 100, rest_sec: 30 }
        ]
      },
      {
        label: 'Recovery swim',
        items: [
          { text: '100m breaststroke - super easy', distance_m: 100 },
          { text: '100m backstroke - float and kick gently', distance_m: 100 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m choice stroke - whatever feels good, zero effort', distance_m: 100 }
        ]
      }
    ]
  },

  // ============================================
  // RECOVERY / REST TEMPLATES
  // ============================================

  'recovery-easy-swim': {
    id: 'recovery-easy-swim',
    name: 'Recovery Easy Swim',
    source: '6-week',
    tags: ['recovery'],
    phase_fit: ['BUILD', 'SHARPEN', 'TAPER'],
    intensity: 'easy',
    base_distance_m: 800,
    base_duration_min_est: 25,
    structure: [
      {
        label: 'Warm-up',
        items: [
          { text: '100m freestyle VERY EASY - just get the body moving, long smooth strokes', distance_m: 100 },
          { text: '100m breaststroke - slow, exaggerate the glide phase', distance_m: 100 }
        ]
      },
      {
        label: 'Main set - Active recovery',
        items: [
          { text: '100m freestyle easy - focus on relaxed breathing', distance_m: 100 },
          { text: '100m backstroke easy - let arms float up', distance_m: 100 },
          { text: '100m breaststroke easy - long glides, no rush', distance_m: 100 },
          { text: '100m freestyle easy - count strokes, try to minimize', distance_m: 100 }
        ]
      },
      {
        label: 'Cool-down',
        items: [
          { text: '100m choice stroke - whatever feels best, zero effort', distance_m: 100 },
          { text: '100m easy backstroke - float and kick gently', distance_m: 100 }
        ]
      }
    ]
  },

  'rest-day': {
    id: 'rest-day',
    name: 'Rest Day',
    source: '6-week',
    tags: ['recovery'],
    phase_fit: ['BUILD', 'SHARPEN', 'TAPER'],
    intensity: 'rest',
    base_distance_m: 0,
    base_duration_min_est: 0,
    structure: []
  }
};

/**
 * Get all templates
 */
function getAllTemplates() {
  return Object.values(TEMPLATES);
}

/**
 * Get template by ID
 */
function getTemplateById(id) {
  return TEMPLATES[id] || null;
}

/**
 * Get templates by phase
 */
function getTemplatesByPhase(phase) {
  return getAllTemplates().filter(t => t.phase_fit.includes(phase));
}

/**
 * Get templates by tag
 */
function getTemplatesByTag(tag) {
  return getAllTemplates().filter(t => t.tags.includes(tag));
}

/**
 * Get templates by intensity
 */
function getTemplatesByIntensity(intensity) {
  return getAllTemplates().filter(t => t.intensity === intensity);
}

/**
 * Get templates by source program
 */
function getTemplatesBySource(source) {
  return getAllTemplates().filter(t => t.source === source);
}

/**
 * Get templates suitable for a given distance range
 */
function getTemplatesByDistanceRange(minDist, maxDist) {
  return getAllTemplates().filter(t =>
    t.base_distance_m >= minDist && t.base_distance_m <= maxDist
  );
}

// Export for use in other modules
window.CoachTemplates = {
  TEMPLATES,
  getAllTemplates,
  getTemplateById,
  getTemplatesByPhase,
  getTemplatesByTag,
  getTemplatesByIntensity,
  getTemplatesBySource,
  getTemplatesByDistanceRange
};
