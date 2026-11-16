# Spanish anatomical nomenclature: style guide for Wazo Anatomy

Audience: medical, nursing and physiotherapy students in Spain and Latin America. Register:
standard international Spanish as used in university anatomy textbooks. Neutral, no regionalisms.

## Source and independence

Translate from the Latin (la) and English (en) of each term. Use your own anatomical knowledge.
Do NOT copy from, and do NOT open, any existing Spanish term list for this project.

## Format

- Sentence case: first letter uppercase, the rest lowercase. Keep capitals only for proper names
  and eponyms ("Ligamento de Cooper", "Trompa de Eustaquio", "Círculo arterial de Willis").
- Noun first, then adjectives ("Arteria carótida común", never "Común arteria carótida").
- Plural stays plural ("Músculos intercostales internos").
- Keep Roman numerals as in the source ("Vértebra torácica I", "Nervio óptico (II)").
  Ribs: ordinal in words ("Primera costilla" ... "Duodécima costilla"), as in Spanish textbooks.
- No Latin-English hybrids, no anglicisms when Spanish has a standard term.
- Keep the qualifier punctuation of the source only when it carries meaning, as in "(II)".
- Latin forms that Spanish retains stay as they are: atlas, axis, hilio, vermis, bulbo, tálamo.

## Fixed vocabulary (use these every time)

| Latin / English                                              | Spanish                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| os / bone                                                    | hueso (the word "Os" in a name: "Hueso frontal")                                                                                                                                                                                         |
| musculus / muscle                                            | músculo, with the established Spanish name ("Músculo dorsal ancho", "Músculo glúteo mayor", "Músculo recto femoral", "Músculo deltoides")                                                                                                |
| tendo / tendon                                               | tendón                                                                                                                                                                                                                                   |
| ligamentum                                                   | ligamento                                                                                                                                                                                                                                |
| articulatio / joint                                          | articulación                                                                                                                                                                                                                             |
| arteria, vena, nervus, ganglion, plexus                      | arteria, vena, nervio, ganglio, plexo                                                                                                                                                                                                    |
| ramus / branch                                               | rama                                                                                                                                                                                                                                     |
| truncus / trunk                                              | tronco                                                                                                                                                                                                                                   |
| foramen                                                      | agujero ("Agujero magno", "Agujero oval")                                                                                                                                                                                                |
| canalis (bony or fibrous canal)                              | conducto ("Conducto inguinal")                                                                                                                                                                                                           |
| sulcus                                                       | surco                                                                                                                                                                                                                                    |
| fossa                                                        | fosa                                                                                                                                                                                                                                     |
| fissura / fissure                                            | fisura                                                                                                                                                                                                                                   |
| incisura / notch                                             | escotadura                                                                                                                                                                                                                               |
| processus of a bone                                          | apófisis ("Apófisis espinosa"); processus elsewhere: proceso                                                                                                                                                                             |
| tuberculum, tuberositas                                      | tubérculo, tuberosidad                                                                                                                                                                                                                   |
| crista, linea                                                | cresta, línea                                                                                                                                                                                                                            |
| facies, margo, angulus                                       | cara, borde, ángulo                                                                                                                                                                                                                      |
| corpus, caput, collum, basis                                 | cuerpo, cabeza, cuello, base                                                                                                                                                                                                             |
| apex                                                         | vértice                                                                                                                                                                                                                                  |
| lamina, pars                                                 | lámina, parte                                                                                                                                                                                                                            |
| bursa                                                        | bolsa ("Bolsa subacromial")                                                                                                                                                                                                              |
| vagina tendinis                                              | vaina tendinosa                                                                                                                                                                                                                          |
| retinaculum, aponeurosis, fascia                             | retináculo, aponeurosis, fascia                                                                                                                                                                                                          |
| septum                                                       | tabique                                                                                                                                                                                                                                  |
| gyrus, lobus, lobulus                                        | circunvolución, lóbulo, lobulillo                                                                                                                                                                                                        |
| nucleus, fasciculus, commissura                              | núcleo, fascículo, comisura                                                                                                                                                                                                              |
| tract (neural)                                               | tracto ("Tracto corticoespinal"); fasciculus stays fascículo                                                                                                                                                                             |
| hemispherium, cortex                                         | hemisferio, corteza                                                                                                                                                                                                                      |
| superior, inferior, medialis, lateralis, anterior, posterior | superior, inferior, medial, lateral, anterior, posterior                                                                                                                                                                                 |
| dexter, sinister                                             | derecho, izquierdo                                                                                                                                                                                                                       |
| major, minor, magnus, longus, brevis                         | mayor, menor, magno, largo, corto; for magnus on muscles use "mayor" ("Músculo aductor mayor", "Músculo glúteo mayor"); veins keep the established "magna" and "parva" ("Vena safena magna", "Vena safena parva", "Vena cardíaca magna") |
| profundus, superficialis, communis, proprius                 | profundo, superficial, común, propio                                                                                                                                                                                                     |
| internus, externus, intermedius                              | interno, externo, intermedio                                                                                                                                                                                                             |

## Groups and unofficial names

- `kind: "group"` entries are categories of the hierarchy tree ("Vertebral column"). Translate
  them as section names ("Columna vertebral", "Músculos del abdomen").
- Entries with `official: false` and empty Latin are descriptive names from the 3D model
  ("Adductor minimus"). Translate the English with the same conventions.
- Use `parentEn` only as context to disambiguate, never as part of the name.

## Confidence

For each term set `confidence`: "high" when this is the established Spanish name, "medium" when
more than one Spanish form is in use and you chose one, "low" when you are not sure. When not
"high", add `note` in Spanish or English: the alternatives and why you chose this form.

## Editorial decisions (fixed after the first translation pass, apply them)

- Lymph nodes (nodus lymphoideus): "ganglio linfático", never "nódulo". "Nódulo linfático" is only
  for lymphoid nodules (folliculi).
- Systems vs apparatus: "aparato" for digestive, respiratory, urinary, genital, lacrimal and
  locomotor; "sistema" for nervous, cardiovascular, lymphatic, endocrine, skeletal, muscular.
- Fibula: the bone is "peroné"; every derived adjective follows the Terminologia Anatomica form
  "fibular" ("nervio fibular común", "ligamento talofibular anterior", "articulación tibiofibular
  superior", "ligamento calcaneofibular").
- Ulna and radius: "cúbito" and "radio", adjectives "cubital" and "radial".
- Patella: "rótula", adjective "rotuliano" ("tendón rotuliano", "bolsa infrarrotuliana").
- Other bones keep the common Spanish name: astrágalo, hueso grande, piramidal, escafoides.
- Heart: "aurícula" (not atrio), "arco de la aorta".
- Omentum: "omento" (not epiplón).
- Buccinator: "buccinador", as in Spanish textbooks.
- Talus compounds use "talo-": talocalcáneo, talonavicular, tibiotalar, talofibular.
