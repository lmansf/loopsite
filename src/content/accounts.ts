/**
 * src/content/accounts.ts — THE TEXT.
 *
 * Twelve accounts of one four-second power cut, shaped by `./schema.ts`.
 * Concept: design/10-narrative-concept.md ("the same four seconds").
 *
 * Voice law, enforced by tests/unit/corpus.test.ts:
 *   lowercase throughout, full stops and commas and question marks only,
 *   third person, past tense, short declarative sentences, no second person,
 *   one simile per account at most and it comes from that witness's own world.
 *
 * Bracketed words are the only affordance. Each matches one aside in the same
 * account, and opening that aside grants its id as a key, permanently. A block
 * with `needs` is interleaved at its written position, so the lines around it
 * are unchanged and mean something else.
 */

import type { Corpus } from './schema.ts';

export const CORPUS: Corpus = {
  accounts: [
    // ---------------------------------------------------------------- dog ---
    {
      id: 'dog',
      title: 'the dog',
      standfirst: 'a dog beside a heater, in a house with a door that was shut all evening.',
      ask: 'ask the streetlight',
      next: 'lamp',
      blocks: [
        {
          id: 'dog-1',
          text: "the dog was awake because the dog is always awake at [eleven oh four]. the dark came in one piece, like a held breath. the heater stopped its small noise. then the dog heard [the second click]. there is only supposed to be one.",
        },
        {
          id: 'dog-outside',
          needs: 'one-press',
          text: "the second click came from outside the house. the dog knew the difference at once. the first click was under the floor, close and flat. the second one was a long way up, and small with distance. it is the one the dog has kept.",
        },
        {
          id: 'dog-2',
          text: "in the dark the house got bigger. the dog counted the ways out, the way it does, and found one more than it started with. the [back door] was standing open a hand's width. it had been shut all evening.",
        },
        {
          id: 'dog-3',
          text: "there was a smell on the step that was not the step's smell. wet wool. somebody's hands. it went [up the road], not down it. the dog stood in the doorway and did not follow, because the dog had not been told to.",
        },
        {
          id: 'dog-4',
          text: "then the light came back. the heater started. the house was the right size again. the dog lay down in the shape it had been lying in before. that is what a dog does with four seconds. the [wool] smell stayed on the step.",
        },
        {
          id: 'dog-5',
          text: "the dog slept. in the morning the back door was shut. there were boots by the heater with the wet still in them. the dog lay against the boots until they were dry. that is a job. nobody had given the dog another one.",
        },
      ],
      asides: [
        {
          id: 'the-hour-has-a-smell',
          word: 'eleven oh four',
          open: true,
          text: "the dog does not know what a clock is. the dog knows what eleven oh four smells like. it smells like the heater at its lowest, and the road going cold, and nobody on it.",
        },
        {
          id: 'two-clicks',
          word: 'the second click',
          text: "a click is a switch. two clicks is two switches, or one switch pressed twice. the dog has heard the first one every night of its life. it had never heard the second one before.",
        },
        {
          id: 'door-open',
          word: 'back door',
          text: "the dog had heard it open, earlier, and had decided it was the wind, which is what the dog decides. the wind does not put a shoe down on the step on its way through.",
        },
        {
          id: 'road-goes-one-place',
          word: 'up the road',
          text: "the road only goes one place. the dog has never been there. the dog has smelled everything that has ever come back down from it. everything comes back colder than it went.",
        },
        {
          id: 'wet-wool',
          word: 'wool',
          text: "wet wool, and river silt under the wool. the smell is still on the step at seven. it is not there at eight. something washed the step, and it was not rain, because there was none.",
        },
      ],
    },

    // --------------------------------------------------------------- lamp ---
    {
      id: 'lamp',
      title: 'the streetlight',
      standfirst: 'a streetlight on the bridge road, which has never seen the bridge.',
      ask: 'ask the kettle',
      next: 'kettle',
      blocks: [
        {
          id: 'lamp-1',
          text: "the streetlight was doing what it does, which is stand and be on. it did not go out. it [dimmed] first. the filament went down like something leaning. the road under it turned the colour it turns in rain.",
        },
        {
          id: 'lamp-2',
          text: "then it went out, [half a second] after the dimming. that is a long time to a filament. it came back the way it left, low first and then whole. nothing in the street changed except the street.",
        },
        {
          id: 'lamp-clicks',
          needs: 'two-clicks',
          text: "a lamp does not hear clicks. it has one of its own, at dusk, and that one it feels. the night the current failed it felt nothing at dusk. it felt what it feels every dusk. whatever was pressed was not pressed here.",
        },
        {
          id: 'lamp-3',
          text: "the last bus had gone under the pole a minute before, carrying its own light. the pole had nothing to say about it. a streetlight is not a witness to traffic. it is a witness to one circle of road, always the same circle.",
        },
        {
          id: 'lamp-4',
          text: "the streetlight lights the road and nothing else. it faces down at the tarmac, which is [the wrong way] for a bridge. the bridge begins where the pole ends. the lamp has stood beside water it has never once seen.",
        },
        {
          id: 'lamp-bridge',
          needs: 'light-on-the-bridge',
          text: "there was light on the bridge that night. none of it came out of the streetlight. the lamp cannot see the bridge. it can see the tarmac at its foot go pale and then paler. that is what happens when something lit goes by behind it.",
        },
        {
          id: 'lamp-valley',
          belief: 'valley',
          text: "the failure came to the lamp [from below]. the dimming travelled up the wire from the houses. it reached the pole late and it reached the bridge road later. by then the hill end of the wire was already quiet, and the lamp is sure of that.",
        },
        {
          id: 'lamp-hill',
          belief: 'hill',
          text: "the failure came to the lamp [from above]. the dimming came down off the hill along the wire. it reached the pole before it reached the houses. the lamp went first on its own road and last in its own street. the lamp is sure of that.",
        },
        {
          id: 'lamp-5',
          text: "by the time the light was whole again, the road was dry where it had been dry. it was wet where it had been wet. the streetlight went back to standing and being on. it has been on every night since. it has still never seen the bridge.",
        },
      ],
      asides: [
        {
          id: 'dimmed-first',
          word: 'dimmed',
          text: "a streetlight that is switched off stops. a streetlight that dims is being pulled at. the difference is in the wire and in the eye, and it lasted long enough for a moth further down the valley to notice.",
        },
        {
          id: 'half-a-second',
          word: 'half a second',
          text: "half a second is how long a hot filament takes to stop being hot. the dimming was the lamp cooling and nothing else. whatever happened to the current happened all at once. the light was simply slower than it.",
        },
        {
          id: 'lamp-faces-away',
          word: 'the wrong way',
          text: "the hood over the bulb throws everything downward, so the road is bright and the parapet is not. anything on the bridge at night is lit by whatever it brought with it, and by nothing the valley owns.",
        },
        {
          id: 'lit-from-below',
          word: 'from below',
          text: "a wire has two ends and the lamp is in the middle of it. the lamp felt one end go quiet before the other end. it cannot show that difference to anybody. it has no way to be wrong about it either.",
        },
        {
          id: 'lit-from-above',
          word: 'from above',
          text: "a wire has two ends and the lamp is in the middle of it. the lamp felt one end go quiet before the other end. the hill end is uphill. the lamp has never been wrong about which way its own road runs.",
        },
      ],
    },

    // ------------------------------------------------------------- kettle ---
    {
      id: 'kettle',
      title: 'the kettle',
      standfirst: 'a kettle most of the way to boiling, in a kitchen with nobody in it.',
      ask: 'ask the moth',
      next: 'moth',
      blocks: [
        {
          id: 'kettle-1',
          text: "the kettle was most of the way to boiling. the element went cold with the rest of the valley. the kettle did not know it yet. water that is nearly boiling is [still climbing] for a while after the heat stops. the noise got louder before it got quieter.",
        },
        {
          id: 'kettle-2',
          text: "the element came back before the ceiling did. the kettle felt itself go [warm again] underneath and the room above it was still dark. it is a small gap. it is long enough for a kettle to be certain there was one.",
        },
        {
          id: 'kettle-count',
          needs: 'six-wingbeats',
          text: "the dark in that kitchen was four seconds long. the kettle would say so again. a kettle measures in heat, and the heat did not have time to go anywhere. whatever else the dark was, it was not long enough to cool a full kettle.",
        },
        {
          id: 'kettle-3',
          text: "the kettle had been filled to [two cups]. it was standing on its base with its switch held down. nobody came for it. it boiled. it clicked itself off. it cooled in that kitchen for a long time after the lights came back.",
        },
        {
          id: 'kettle-4',
          text: "the back door was open the whole time. the kitchen went cold from the floor up, the way a kitchen does. the steam off the spout leaned toward the doorway. a kettle knows which way the air is going. it knows nothing about why.",
        },
        {
          id: 'kettle-5',
          text: "in the morning the kettle was full and cold. the switch was still down. somebody filled it again without emptying it first, which is the wrong way to do it. then it went on again. the mark on the side was the second one.",
        },
      ],
      asides: [
        {
          id: 'the-boil-never-stopped',
          word: 'still climbing',
          text: "the water at the bottom was hotter than the water at the top and kept going up into it. for most of the four seconds that kitchen sounded exactly like a kitchen with the power on. sound is a slow witness.",
        },
        {
          id: 'power-came-back-first',
          word: 'warm again',
          text: "a filament in a ceiling has to get hot before it is light. an element in a kettle only has to be fed. the power came back to both of them in the same instant. the kettle was simply quicker to say so.",
        },
        {
          id: 'kettle-for-two',
          word: 'two cups',
          text: "the kettle is filled to a mark on its side, and the mark that night was the second one. it had been filled to the second mark every evening that week. it is the only thing in that kitchen that keeps a record.",
        },
      ],
    },

    // --------------------------------------------------------------- moth ---
    {
      id: 'moth',
      title: 'the moth',
      standfirst: 'a moth on the cold side of a warm pane.',
      ask: 'ask the river',
      next: 'river',
      blocks: [
        {
          id: 'moth-1',
          text: "the moth was on [the glass] with its wings shut. a moth does that when the pane is warmer than the air. the light behind it went out. the moth did not move, because there was nowhere better. it began to count in the only unit it has.",
        },
        {
          id: 'moth-2',
          text: "the dark lasted [six] wingbeats. a wingbeat is a second to a moth in the cold, near enough. the moth has never had cause to doubt it. then the pane was bright again. the moth was still holding on to it.",
        },
        {
          id: 'moth-3',
          text: "[the air] did not change. air is the first thing a moth reads and the last thing it stops reading. over the valley that night it was still and cold and going nowhere. whatever put the lights out did not move any of it.",
        },
        {
          id: 'moth-4',
          text: "in the dark the pane stopped being a lit thing. it became a flat black thing with a valley in it, upside down and very small. the moth had never seen that before. it has not seen it since. the valley has not gone out again.",
        },
        {
          id: 'moth-room',
          needs: 'the-room-behind',
          text: "the pane had a room on the other side of it the whole time. the moth had never once looked through. when the light went, the room went with it. the valley came up in the pane instead. the moth kept its wings shut for all six of it.",
        },
        {
          id: 'moth-5',
          text: "then the light came back and the pane was a lit thing again. the moth opened its wings once and shut them. it stayed until the pane went cold, which was long after. it did not come to that house again.",
        },
      ],
      asides: [
        {
          id: 'glass-warm',
          word: 'the glass',
          text: "a window that has been lit all evening holds the heat of the room in it. the moth was not at the light. the moth was at the warm, and the warm outlasted the light by a long way.",
        },
        {
          id: 'six-wingbeats',
          word: 'six',
          text: "the moth does not have four of anything. it has wings, and it counts what they do. this is not an opinion. it is a number of movements that happened, one after another, in the dark.",
        },
        {
          id: 'the-air-did-not-move',
          word: 'the air',
          text: "no wind, no rain, nothing crossing the valley above the roofs. a moth is a scale for air. if weather had put the lights out, a moth would have been the first thing in the valley to know it.",
        },
      ],
    },

    // -------------------------------------------------------------- river ---
    {
      id: 'river',
      title: 'the river',
      standfirst: 'the water under the bridge, which has a before and an after.',
      ask: 'ask the last bus',
      next: 'bus',
      blocks: [
        {
          id: 'river-1',
          text: "the river does not have a night. it has a [before and after]. between them it has the same water going the same way. nothing in the four seconds reached the river as an event. it came out of them carrying what it went in with, and one thing more.",
        },
        {
          id: 'river-2',
          text: "the bridge had [no light on it]. not that night and not any night. the lamp stands on the road at the near end with its hood down. the water under the arch is the darkest water in the valley. that is why the fish are there.",
        },
        {
          id: 'river-3',
          text: "for part of it the river [carried] something bright. a river carries light the way it carries a leaf. it does not make it and it cannot say where it got it. the brightness came down from above the arch. it went under and did not come out.",
        },
        {
          id: 'river-bridge',
          needs: 'light-on-the-bridge',
          text: "a thing on the bridge is not a thing on the river. it is above it. everything above the arch reaches the water second hand. the river held a light for a moment. the bridge over it held nothing. that was one moment and not two.",
        },
        {
          id: 'river-4',
          text: "[the shallow end] is where the bank goes down and the stones are flat. things cross there. that night something crossed there, later, going the way the water goes. it went slowly. the stones are the stones, and it was not in a hurry.",
        },
        {
          id: 'river-5',
          text: "in the morning the river was the same river. the silt at the flat stones was turned over and it had settled again by noon. a river keeps nothing. it had let go of the four seconds before the four seconds were over.",
        },
      ],
      asides: [
        {
          id: 'river-has-no-now',
          word: 'before and after',
          text: "the river measures everything by what is different downstream. a thing that changes nothing downstream did not happen to the river at all. the dark changed nothing. the river has no opinion about the dark and never will.",
        },
        {
          id: 'bridge-dark',
          word: 'no light on it',
          text: "the underside of the arch has never been lit. the river has never seen the shape of the bridge, only felt where the water goes quick and where it goes slow. dark is the normal condition of a bridge.",
        },
        {
          id: 'the-reflection',
          word: 'carried',
          text: "water takes a light and stretches it and sends it downstream looking like something else. the river cannot tell a lamp from a window from a held thing. it knows only that the light moved, and that it moved faster than the water.",
        },
        {
          id: 'something-in-the-water',
          word: 'the shallow end',
          text: "two legs in a river displace a particular amount, and the river knows the amount. the crossing was downstream of the bridge and it happened well after the light came back. it went down the valley, not across it.",
        },
      ],
    },

    // ---------------------------------------------------------------- bus ---
    {
      id: 'bus',
      title: 'the last bus',
      standfirst: 'the last bus of the night, running the whole route for nobody.',
      ask: 'ask the radio',
      next: 'radio',
      blocks: [
        {
          id: 'bus-1',
          text: "the last bus was on the bridge when the valley went out. it did not go out with it. a bus carries [its own lights] and its own engine and it is on nobody's wire. the hands on the wheel did not move. the bus crossed at its usual speed.",
        },
        {
          id: 'bus-2',
          text: "there was [a light] on the bridge. it was not the bus. it was ahead of the bus and low, about the height of a hand held down. it was going the other way, toward the hill, at walking pace.",
        },
        {
          id: 'bus-3',
          text: "the bus has [nobody on it] after the second to last stop. it runs the rest of the route anyway. the doors opened at the stop before the bridge and shut again. that is the route. the route does not care what the valley is doing.",
        },
        {
          id: 'bus-bridge',
          needs: 'bridge-dark',
          text: "the water says there was no light on the bridge. the bus was on the bridge. a thing carried at the height of a hand sits below the parapet from underneath. from in front it sits above it. the bus did not look down. the river could not look up.",
        },
        {
          id: 'bus-4',
          text: "four seconds is about a bus length at that speed. the valley went dark and came back. the bus was in a slightly different place. the light on the bridge was in a different place too, further up, still going.",
        },
        {
          id: 'bus-5',
          text: "the bus finished the route and turned at the top of the valley. it came back down the same road a while later with its lights still on. the bridge was empty by then. the road up the hill is not lit. the bus does not go that way.",
        },
      ],
      asides: [
        {
          id: 'bus-runs-on-itself',
          word: 'its own lights',
          text: "everything in a bus comes off the engine. when the streetlights went, the bus was the brightest thing in the valley for four seconds. the interior lamps were on over empty seats, as they are every night at that hour.",
        },
        {
          id: 'light-on-the-bridge',
          word: 'a light',
          text: "it was small and yellow and it swung. a light that swings is being carried. it did not turn toward the bus and it did not step aside, and the bridge is wide enough that it did not have to.",
        },
        {
          id: 'empty-bus',
          word: 'nobody on it',
          text: "the last bus is empty most nights by the bridge. it runs the full route because a route that stops halfway is not a route. the bell was not rung. nothing was left on a seat. there is nothing else to add.",
        },
      ],
    },

    // -------------------------------------------------------------- radio ---
    {
      id: 'radio',
      title: 'the radio',
      standfirst: 'a radio talking to a chair.',
      ask: 'ask the clock',
      next: 'clock',
      blocks: [
        {
          id: 'radio-1',
          text: "the radio was talking to an [empty room], which it does not mind and cannot tell. then it stopped. a room that has had a voice in it all evening goes quieter than a room that never had one. the radio was off for four seconds. it did not know.",
        },
        {
          id: 'radio-2',
          text: "before it stopped there was [the tone]. it came out of the middle of a sentence. it was flat and even and it lasted as long as the dark lasted. a radio that loses power does not make a sound. this one made a sound.",
        },
        {
          id: 'radio-3',
          text: "the room is at the front of the house and its window looks down the valley. the radio looks at nothing. it has been in that room long enough to know [the floorboard] by the door. that is the one that goes before somebody comes in.",
        },
        {
          id: 'radio-door',
          needs: 'door-open',
          text: "the back door of that house was open through all of it. the radio is three rooms from the back door. sound goes both ways down a hall. everything said in that room went out into the yard. the tone went out into the yard. the yard was empty.",
        },
        {
          id: 'radio-4',
          text: "then the power came back and the radio [kept talking]. it went on from wherever the sentence had got to, which was not where it left off. it had gone on without the room. it said what it said. then it talked about the weather for an hour.",
        },
        {
          id: 'radio-word',
          needs: 'footsteps-up',
          text: "the first thing the radio said in that room was one word. the word was nobody. then a comma, and the rest of a sentence about the weather on the coast. the room took no notice. there was nobody in the room to take any.",
        },
        {
          id: 'radio-5',
          text: "the radio was still on in the morning. nobody turned it off. it was talking to the chair at seven and at eight. the cup was in the same place. the coat came back to its hook some time before that, and nothing in the room said when.",
        },
      ],
      asides: [
        {
          id: 'empty-room',
          word: 'empty room',
          text: "a chair, a table, a cup that had been drunk from, a coat not on its hook. the radio faces the chair because somebody turned it to face the chair. it had been facing an empty chair since the evening started.",
        },
        {
          id: 'four-seconds-of-tone',
          word: 'the tone',
          text: "the tone was not on the station. the station was gone. it was the set itself, emptying, the way a held note comes out of a pipe when the air behind it stops. four seconds is a long note to a small speaker.",
        },
        {
          id: 'the-floorboard',
          word: 'the floorboard',
          text: "the board by the door goes before anybody comes in, and it goes again on the way out. it went once that evening, on the way out. it has not been mended and it will not be, because only one person walks on it.",
        },
        {
          id: 'radio-kept-going',
          word: 'kept talking',
          text: "a station does not wait. the four seconds happened to the valley and not to the voice. the voice came back further along than it went away, and it never noticed the gap.",
        },
      ],
    },

    // -------------------------------------------------------------- clock ---
    {
      id: 'clock',
      title: 'the clock',
      standfirst: 'the clock on the station wall, wound by hand on a thursday.',
      ask: 'ask the window',
      next: 'window',
      blocks: [
        {
          id: 'clock-1',
          text: "the clock stopped at eleven oh four. the clock started at eleven oh four. [the same minute] holds both of those and the clock has nothing to put between them. as far as the clock is a record, nothing happened.",
        },
        {
          id: 'clock-2',
          text: "the hand had not moved. a minute hand does not move inside a minute. it moves at the end of one. the dark fell inside the minute and got out again before the end of it. the clock lost [four] seconds and cannot produce them.",
        },
        {
          id: 'clock-count',
          needs: 'six-wingbeats',
          text: "something outside counted six. the clock counts by a wire, and the wire was not there to be counted by. for four of the missing seconds the clock has a reason. for the other two it has the same reason. a clock that is not fed is not a clock.",
        },
        {
          id: 'clock-3',
          text: "the station was shut. the platform lights are on a different circuit and they went as well. the clock has a face on the platform side and a face on the road side. both of them say the same thing. it is the one thing a clock can say.",
        },
        {
          id: 'clock-4',
          text: "the clock is wound [by hand]. somebody comes up the steps with a key and does it. somebody has done that for as long as the clock has been counting. it is the only hand the clock has ever had to know about.",
        },
        {
          id: 'clock-5',
          text: "a clock does not have a night. it has a count. the count went on before the dark and it went on after it. the clock cannot join the two ends with anything in the middle. the middle is the only part of that night it does not hold.",
        },
      ],
      asides: [
        {
          id: 'stopped-minute',
          word: 'the same minute',
          text: "a station clock does not keep seconds on its face. it keeps them inside. that minute contains a stop and a start and no distance at all. the clock has filed it as one minute, like every other minute it has kept.",
        },
        {
          id: 'clock-counts-four',
          word: 'four',
          text: "the clock counts by the wire that feeds it. this is not a guess. it is the number of counts that did not arrive. the clock made them up afterwards in one movement, so that the face would be right and the record would not.",
        },
        {
          id: 'wound-by-hand',
          word: 'by hand',
          text: "the winding is done on a thursday. the night the valley went out was a tuesday. nobody had been up the station steps since the winding, and nobody came up them that night. the clock would have felt the steps first.",
        },
      ],
    },

    // ------------------------------------------------------------- window ---
    {
      id: 'window',
      title: 'the window',
      standfirst: 'a window in a front room, facing the long way.',
      ask: 'ask the switch',
      next: 'switch',
      blocks: [
        {
          id: 'window-1',
          text: "the hill was [empty]. the window looks at it every night and it looks the same every night. it looked the same in the dark. it went away and it came back with nothing added to it.",
        },
        {
          id: 'window-2',
          text: "the window is in the front room, and the front of the house is [what it faces]. it faces down the valley over the roofs. the hill it watches is the long one on the far side, with the trees along the top of it.",
        },
        {
          id: 'window-3',
          text: "all evening the glass had been showing [the room] back at itself. a lit space on one side and a dark valley on the other makes a mirror. when the power went, the lit side went with it. for four seconds the glass was only glass and the window could see out.",
        },
        {
          id: 'window-4',
          text: "what it saw was a valley with [no other window] lit in it. that is the whole of what the window has. four seconds of a valley with nothing on anywhere. then the room came back into the glass and hung there until the lamp went off at the wall.",
        },
        {
          id: 'window-wool',
          needs: 'wet-wool',
          text: "something came past under the window later. it was on the path at the front, going round toward the back of the house. the glass had the room in it again by then. the room was between the window and whatever it was. a mirror cannot be a window at the same time.",
        },
        {
          id: 'window-valley',
          belief: 'valley',
          text: "what put the lights out came up the valley, and the window was facing it the whole way. the roofs went in order. the far ones went first and the near ones went last. the window has held the four seconds in that order ever since.",
        },
        {
          id: 'window-hill',
          belief: 'hill',
          text: "what put the lights out came off the hill behind the house, and the window had its back to it. the roofs below went all together, as far as the glass could tell. a thing arriving from behind arrives everywhere in front at once.",
        },
        {
          id: 'window-5',
          text: "the lamp went off at the wall some time after and the glass went clear. the window has been looking down the valley ever since. the hill on the far side is still there. it is still empty. it has been empty for as long as the window has had it.",
        },
      ],
      asides: [
        {
          id: 'hill-empty',
          word: 'empty',
          text: "no light moved on it and nothing stood against the top of it. the window has watched that hill through every weather there is. a light on that hill would sit in the top left pane, and the top left pane was black.",
        },
        {
          id: 'window-faces-the-valley',
          word: 'what it faces',
          text: "the road goes up behind the house. the window has never seen that hill and could not. the hill it has watched all its life is the other one, across the water, and nothing was ever going to walk up that one.",
        },
        {
          id: 'the-room-behind',
          word: 'the room',
          text: "a chair, a radio, a cup on the arm of the chair. all evening that room hung out over the roofs in the glass, the wrong way round and slightly smaller. when the power went it fell out and the valley came in.",
        },
        {
          id: 'no-window-lit',
          word: 'no other window',
          text: "a valley at that hour has some windows lit in it. that valley for four seconds had none. and none came on after, either. nothing lit anywhere while the window was watching, and the window watched the rest of the night.",
        },
      ],
    },

    // ------------------------------------------------------------- switch ---
    {
      id: 'switch',
      title: 'the switch',
      standfirst: 'a switch in a cabinet at the top of a road.',
      ask: 'ask the road',
      next: 'road',
      blocks: [
        {
          id: 'switch-1',
          text: "the switch was pressed [once]. it went down and it came up. down is off and up is on and there is nothing else a switch can be. it was down for four seconds. it had never been down before, on any night, for any reason.",
        },
        {
          id: 'switch-2',
          text: "[nothing was wrong]. the switch has a fault line and the fault line did not trip. the current going through it was the current that goes through it every night. nothing in the cabinet got hot and nothing got wet, and the box was shut afterwards.",
        },
        {
          id: 'switch-clicks',
          needs: 'two-clicks',
          text: "a house below heard two. the switch was pressed once. the sound it makes going down is not the sound it makes coming up. there were four seconds between them. both of those sounds went down the hill, and the switch heard neither of them arrive.",
        },
        {
          id: 'switch-3',
          text: "the cabinet stands at the top of the road behind a fence. the gate in the fence has [a latch] and no lock. there has never been a reason for a lock. the road ends at the gate, and the gate has been shut every time anybody has looked at it.",
        },
        {
          id: 'switch-4',
          text: "the switch does not know what happened to the valley. the switch knows what happened to the switch. between the latch and the handle there was about as long as it takes to cross a yard. between the handle going down and coming up there were four seconds.",
        },
        {
          id: 'switch-valley',
          belief: 'valley',
          text: "everything the switch feeds is below it. down is where the wire goes. down is the only direction the switch has. asked where the dark went, it would say down the hill. house after house, in the order the wire is strung.",
        },
        {
          id: 'switch-hill',
          belief: 'hill',
          text: "the wire comes up to the cabinet from below. it goes on over the shoulder of the hill to somewhere else. the switch sits in the middle of it. asked where the dark went, it would say both ways. the wire goes both ways and a switch does not choose.",
        },
        {
          id: 'switch-5',
          text: "then nothing. the switch has been up ever since. nobody has come through the gate since that night to look at it. there is no record of anything to look at. a switch that is up is a switch that is working.",
        },
      ],
      asides: [
        {
          id: 'one-press',
          word: 'once',
          text: "once is one movement of the handle to the bottom of its travel, and one movement back. the switch does not count those as two. a switch that has been pressed and released has been pressed, and that is one.",
        },
        {
          id: 'no-fault',
          word: 'nothing was wrong',
          text: "a fault opens the switch on its own and leaves a record of why. there is no record. the switch was opened by its handle. the handle only moves when it is moved, and it is stiff, and it is meant to be.",
        },
        {
          id: 'the-latch',
          word: 'a latch',
          text: "the latch lifts with a thumb and it is stiff and it makes a noise doing it. the switch is on the other side of a metal door from it. the switch heard the latch that night. it is the only other thing it heard.",
        },
      ],
    },

    // --------------------------------------------------------------- road ---
    {
      id: 'road',
      title: 'the road',
      standfirst: 'the road up the hill, which only goes one place.',
      ask: 'ask the four seconds',
      next: 'four-seconds',
      blocks: [
        {
          id: 'road-1',
          text: "there were footsteps [going up]. a road takes weight the way it takes rain, all over and all at once. this road had weight on it from the gate at the bottom to the fence at the top. it arrived in order, at the speed of somebody in no hurry.",
        },
        {
          id: 'road-2',
          text: "nothing came back down. the road had weight on it going up and then it had none. it stayed like that until the morning. whatever went up [did not come back] the way it went. the road would have felt it if it had.",
        },
        {
          id: 'road-3',
          text: "the road ends at [the top]. there is a fence and a gate and a cabinet. then there is the hill, which is not for walking on. the road has been finished at that point for longer than anybody has needed it to go further.",
        },
        {
          id: 'road-4',
          text: "the road was [dry] that night and it stayed that way. weight on a road with no water on it is a clean thing to read. a road is under everything and looks at nothing. it has nothing to say about lights, or about what the valley looked like.",
        },
        {
          id: 'road-valley',
          belief: 'valley',
          text: "the weight that came up arrived at the bottom gate from along the valley road. it came from the direction of the houses. the road felt it turn in off the flat. whatever it was had been walking on the level for a while before it started climbing.",
        },
        {
          id: 'road-hill',
          belief: 'hill',
          text: "the weight that came up arrived at the bottom gate from the top of the valley. it came off the track down the shoulder. the road felt it come in from the side and turn uphill. whatever it was had been climbing for a while already.",
        },
        {
          id: 'road-press',
          needs: 'one-press',
          text: "after the fence the weight came off the road at the edge, where the verge goes into the field. a road can feel the last step somebody takes on it. the last step taken on that road that night was not at the bottom of it. it was over the side.",
        },
        {
          id: 'road-water',
          needs: 'something-in-the-water',
          text: "the water runs along the foot of the field, beside the road and below it. it goes from the gate down to the flat stones. it is not a road and it does not report to one. the road stops at the fence and follows the water nowhere.",
        },
        {
          id: 'road-5',
          text: "in the morning the road had the usual weight on it in the usual order. the gate at the top was shut and the latch was down. the field beside it was wet at the bottom, as it always is. the road does not go there.",
        },
      ],
      asides: [
        {
          id: 'footsteps-up',
          word: 'going up',
          text: "a road knows up from down by the order the weight arrives in. it arrived at the bottom first. it took a while. it stopped once, about halfway, for long enough that the road thought it had ended there.",
        },
        {
          id: 'none-coming-down',
          word: 'did not come back',
          text: "the road is the only way up and the only way down, for a road. it is not the only way. there is a field on one side of it, and there is water at the bottom of the field.",
        },
        {
          id: 'road-ends-at-the-box',
          word: 'the top',
          text: "the road was made for the cabinet and for nothing else. it has one destination and the destination has a latch. it has carried a van up twice a year for as long as it has been a road, and nothing else.",
        },
        {
          id: 'road-stayed-dry',
          word: 'dry',
          text: "it had not rained for days. anything coming off that road onto a step came off it dry. the wet came from somewhere else, and at the bottom of that field there is only one somewhere else it could be.",
        },
      ],
    },

    // ------------------------------------------------------- four seconds ---
    {
      id: 'four-seconds',
      title: 'four seconds',
      standfirst: 'the part of the night that nobody was in.',
      ask: 'ask the dog again',
      next: 'dog',
      blankWhenLocked: true,
      blocks: [
        {
          id: 'fs-press',
          needs: 'one-press',
          text: "[a handle] went down in a cabinet at the top of a road. the valley noticed one house at a time. it had finished noticing before anybody in it got as far as standing up.",
        },
        {
          id: 'fs-bridge',
          needs: 'light-on-the-bridge',
          text: "a small yellow light went over the bridge at walking pace. it was below the parapet and above the water, lit by nothing except itself. a bus went the other way past it with its lamps on over empty seats. neither of them stopped.",
        },
        {
          id: 'fs-road',
          needs: 'footsteps-up',
          text: "the weight went up the hill road from the gate to the fence, in order and in no hurry. it stopped once on the way, for long enough to be worth stopping for. nothing came back down that road at all.",
        },
        {
          id: 'fs-windows',
          needs: 'no-window-lit',
          text: "for four seconds a whole valley had nothing lit in it. the glass in the front rooms stopped being a mirror and showed what was out there. what was out there was nothing. then the glass went back to showing the rooms.",
        },
        {
          id: 'fs-radio',
          needs: 'four-seconds-of-tone',
          text: "a radio in an empty house held one flat note for the whole of it. then it came back in the middle of a sentence. then it talked about the weather until morning, to a chair, in a room with the door standing open.",
        },
        {
          id: 'fs-water',
          needs: 'road-stayed-dry',
          text: "the last step taken on that road was over the side of it, into the field, at the top. the field goes down to the water. the water goes down the valley. the water does not report to anything.",
        },
        {
          id: 'fs-wool',
          needs: 'wet-wool',
          text: "there was wet wool on a step by a back door before morning and it was gone by eight. a kettle was filled to the second mark again. [nobody asked] where the four seconds went, because a valley that has its lights back does not ask.",
        },
      ],
      asides: [
        {
          id: 'a-hand-on-a-handle',
          word: 'a handle',
          text: "the handle is stiff and it is meant to be. it takes a thumb and a lean. whoever it was had to want it, and had to come uphill in the cold and the dark to go on wanting it.",
        },
        {
          id: 'nobody-asked',
          word: 'nobody asked',
          text: "the boots were dry by the time anybody came for them. the dog had lain against them all morning to do it. that is the whole of what the house did about it, and for the house it was enough.",
        },
      ],
    },
  ],

  contradictions: [
    {
      id: 'clicks',
      needs: ['two-clicks', 'one-press'],
      line: 'the dog heard two clicks. the switch was pressed once. neither of them can hear the other one counting.',
    },
    {
      id: 'bridge',
      needs: ['bridge-dark', 'light-on-the-bridge'],
      line: 'the river held a light that night and the bridge over it held none. the bridge is between them.',
    },
    {
      id: 'count',
      needs: ['six-wingbeats', 'clock-counts-four'],
      line: 'the moth counted six and the clock counted four. one of them was cold and the other one was not being fed.',
    },
    {
      id: 'hill',
      needs: ['hill-empty', 'footsteps-up'],
      line: 'the hill was empty from the window and the road had somebody on it. the window is at the front of the house and the road goes up the back.',
    },
    {
      id: 'both',
      needs: ['lit-from-below', 'lit-from-above'],
      line: 'the same four seconds have now been read from the valley and from the hill. somebody walked up in both of them, and came home in the water in both of them.',
    },
  ],

  choice: {
    prompt: 'which way did the dark come?',
    options: [
      { belief: 'valley', label: 'it came from the valley' },
      { belief: 'hill', label: 'it came from the hill' },
    ],
  },
};

export default CORPUS;
