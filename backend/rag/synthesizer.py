"""4-Layer Pedagogical Synthesizer Node (Core Intuition, CBSE Board Answer, Competitive Bridge, Examiner's Trap)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .grader import resolve_chapter_slug
from .schema import AgentState, LayeredAnswer, PipelineStage

BASE_DIR = Path(__file__).resolve().parents[2]
LESSONS_DIR = BASE_DIR / "server" / "data" / "lessons"

AI_CLICHE_PATTERNS = [
    re.compile(r"as an ai language model", re.I),
    re.compile(r"certainly! here is", re.I),
    re.compile(r"sure thing", re.I),
    re.compile(r"i hope this helps", re.I),
    re.compile(r"feel free to ask", re.I),
    re.compile(r"in conclusion, it is important", re.I),
]

SI_UNIT_RE = re.compile(
    r"\b\d+(?:\.\d+)?\s*(?:m/s|cm|m|v|a|ohm|dioptre|d|w|j|n|s|pa|°c|k|g|kg)\b",
    re.I,
)

# Curated NCERT Class 10 topic grounding profiles keyed by OKF topic_tag
_TOPIC_PROFILES: Dict[str, Dict[str, str]] = {
    "chemical_reactions_and_equatio": {
        "coreIntuition": "Imagine two Lego bricks snapping firmly together into a single solid block, releasing trapped warmth as they lock in place.",
        "boardAnswer": (
            "1. When **calcium oxide** (quicklime, CaO) reacts vigorously with water, it forms **slaked lime** (**calcium hydroxide**, Ca(OH)2) with a large release of heat [1 Mark].\n"
            "2. Balanced chemical equation: CaO(s) + H2O(l) -> Ca(OH)2(aq) + Heat [1 Mark].\n"
            "3. Because two reactants combine to form a single product, this is a **combination reaction**, and because the beaker becomes hot, it is an **exothermic reaction** [1 Mark]."
        ),
        "competitiveBridge": "NEET / JEE Foundation: Hydration of metal oxides is strongly exothermic (negative enthalpy change); Ca(OH)2 is sparingly soluble in water and its clear filtrate (lime water) turns milky with CO2 due to insoluble CaCO3 precipitation.",
        "examinersTrap": "Confusing quicklime (CaO) with slaked lime (Ca(OH)2) or omitting the heat-release observation in Activity 1.1.",
    },
    "importance_of_ph_in_everyday_": {
        "coreIntuition": "Think of a swimming pool's water balance: if the water turns too acidic, it etches the tiles; an exact chemical balance protects surfaces.",
        "boardAnswer": (
            "1. Tooth decay begins when mouth pH drops below **pH 5.5**, causing bacteria-generated acid to corrode **calcium hydroxyapatite** enamel [1 Mark].\n"
            "2. **Antacid** bases (such as magnesium hydroxide) neutralize excess stomach HCl, and farmers adjust acidic soil with quicklime or chalk [1 Mark].\n"
            "3. **Bleaching powder** (**calcium oxychloride**, CaOCl2) is prepared by passing chlorine gas over dry slaked lime: Ca(OH)2 + Cl2 -> CaOCl2 + H2O [1 Mark]."
        ),
        "competitiveBridge": "NEET Chemistry & Physiology: Enamel demineralization follows solubility equilibrium shifts in acidic media; digestive HCl buffering illustrates weak-base neutralization kinetics.",
        "examinersTrap": "Stating that tooth enamel dissolves in neutral water instead of acid corrosion below the critical pH 5.5 threshold.",
    },
    "chemical_properties_of_carbon_": {
        "coreIntuition": "Esterification is like weaving two threads with an acid needle into a sweet-smelling fabric, while saponification unwinds that fabric using soap alkali.",
        "boardAnswer": (
            "1. **Esterification**: Ethanoic acid reacts with absolute ethanol in the presence of an **acid catalyst** (conc. H2SO4) to form a **sweet-smelling ester** (ethyl ethanoate): CH3COOH + C2H5OH -> CH3COOC2H5 + H2O [1.5 Marks].\n"
            "2. **Saponification**: Treating an ester with NaOH hydrolyzes it back to alcohol and **sodium carboxylate** (soap): CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH [1.5 Marks].\n"
            "3. Concentrated H2SO4 acts as both catalyst and dehydrating agent shifting equilibrium forward [1 Mark]."
        ),
        "competitiveBridge": "JEE Organic Synthesis: Fischer esterification is reversible nucleophilic acyl substitution (acid-catalyzed), whereas base-promoted saponification is driven irreversibly by resonance-stabilized carboxylate ion formation.",
        "examinersTrap": "Omitting concentrated H2SO4 as the acid catalyst in esterification or describing saponification as acid-catalyzed.",
    },
    "chemical_properties_of_metals": {
        "coreIntuition": "Like a diplomatic ambassador fluent in two rival languages: acting as a base when meeting acids, and switching to an acid when meeting strong bases.",
        "boardAnswer": (
            "1. Assertion (A) is TRUE: **aluminium oxide** (Al2O3) reacts with HCl to form AlCl3 + H2O and with NaOH to form **sodium aluminate** (NaAlO2) + H2O [1 Mark].\n"
            "2. Reason (R) is TRUE: Al2O3 is an **amphoteric oxide** exhibiting **both acidic and basic properties** [1 Mark].\n"
            "3. Both (A) and (R) are true, and (R) is the correct explanation of (A) [1 Mark]."
        ),
        "competitiveBridge": "JEE Inorganic Periodicity: Amphoteric behaviour peaks along the diagonal metalloid border (BeO, Al2O3, ZnO, SnO, PbO) due to intermediate electronegativity and polarizing power.",
        "examinersTrap": "Writing the formula of sodium aluminate incorrectly as NaAlO3 instead of NaAlO2.",
    },
    "refraction_lens_power": {
        "coreIntuition": "Think of balancing a seesaw right at the midpoint: placing an object at 2F produces an equal-sized inverted image on the opposite 2F side.",
        "boardAnswer": (
            "1. For a **real and inverted** image of equal size (**magnification** m = -1), v = +50 cm implies u = -50 cm [1 Mark].\n"
            "2. Using the lens formula 1/f = 1/v - 1/u = 1/50 - 1/(-50) = 2/50, the **focal length** is f = +25 cm = +0.25 m [1 Mark].\n"
            "3. **Power of a lens** P = 1 / f(m) = 1 / (+0.25 m) = +4 D (**dioptre**) [1 Mark]."
        ),
        "competitiveBridge": "JEE Geometrical Optics: Thin lenses in contact combine powers algebraically as P = P1 + P2; magnification m = f / (f + u) accelerates multi-lens focal shifts.",
        "examinersTrap": "Computing lens power directly with focal length in cm (1/25 = 0.04 D) instead of converting f into meters (+0.25 m -> +4 D).",
    },
    "ohms_law_resistance": {
        "coreIntuition": "Water flowing through a garden pipe: doubling pump pressure doubles the flow rate, provided the pipe width and temperature stay steady.",
        "boardAnswer": (
            "1. **Ohm's law** states that the **potential difference** (V) across a metallic conductor is directly proportional to **current** (I), provided **constant temperature** and physical conditions hold (V = IR) [1 Mark].\n"
            "2. **Resistance** R = V / I is measured in ohm (1 ohm = 1 V / 1 A), and the slope of a linear V-I graph gives R [1 Mark].\n"
            "3. **Non-ohmic conductors** such as semiconductor diodes deviate from a straight line through the origin [1 Mark]."
        ),
        "competitiveBridge": "JEE Main Physics: For non-ohmic elements (p-n junction diodes, thermistors), static resistance V/I differs from dynamic differential resistance dV/dI; Joule heating increases R in metals as temperature rises.",
        "examinersTrap": "Omitting the mandatory condition 'at constant temperature', which causes experimental V-I plots to curve upward due to filament heating.",
    },
    "flemings_left_hand_rule_moto": {
        "coreIntuition": "Imagine pushing a revolving door: pushing forward on the left side while pulling back on the right keeps it spinning smoothly in one direction.",
        "boardAnswer": (
            "1. **Fleming's Left-Hand Rule**: Stretch thumb, forefinger, and middle finger mutually perpendicular; forefinger gives magnetic field, middle finger gives current, and thumb gives **magnetic force** (motion) [1.5 Marks].\n"
            "2. Electric motor principle: a current-carrying rectangular coil in a magnetic field experiences a torque couple [1.5 Marks].\n"
            "3. The **split-ring commutator** **reverses the direction of current** every half rotation to sustain **continuous rotation** [1 Mark]."
        ),
        "competitiveBridge": "JEE Electromagnetism: Torque on a current loop is tau = N * I * A * B * sin(theta), reaching zero at vertical equilibrium unless commutator reversal carries angular momentum past dead center.",
        "examinersTrap": "Confusing Fleming's Left-Hand Rule (force on motor conductor) with Fleming's Right-Hand Rule (induced current in generators).",
    },
    "atmospheric_refraction": {
        "coreIntuition": "A tiny coin at the bottom of a rippling pool appears to shimmer wildly, whereas a wide beach towel on the same pool floor stays visibly steady.",
        "boardAnswer": (
            "1. Assertion (A) and Reason (R) are both TRUE, and (R) explains (A) [1 Mark].\n"
            "2. Stars act as **point-sized sources**; **continuous optical density change** in atmospheric layers causes **atmospheric refraction** that shifts apparent star position and brightness [1 Mark].\n"
            "3. Planets are closer **extended sources** (collections of many point sources) whose individual brightness shifts average to zero, so they **nullify the twinkling effect** [1 Mark]."
        ),
        "competitiveBridge": "JEE Optics: Angular size subtended by planets exceeds atmospheric turbulence seeing cells (Fried parameter), averaging out scintillation.",
        "examinersTrap": "Claiming stars physically change their light output rather than atmospheric refractive index fluctuations bending incoming rays.",
    },
    "transportation_human_heart": {
        "coreIntuition": "A dual-lane expressway separated by a solid concrete median so incoming clean delivery trucks never mix with outgoing exhaust trucks.",
        "boardAnswer": (
            "1. The **four-chambered heart** uses a thick muscular **interventricular septum** to prevent mixing of oxygenated and deoxygenated blood [1 Mark].\n"
            "2. **Double circulation** routes blood twice per cycle: **pulmonary circulation** (right ventricle to lungs) and **systemic circulation** (left ventricle to body) [1 Mark].\n"
            "3. Complete separation meets the **high energy requirements** of warm-blooded mammals and birds to maintain constant body temperature [1 Mark]."
        ),
        "competitiveBridge": "NEET Biology: Contrast 4-chambered complete double circulation (birds/mammals) with 3-chambered incomplete double circulation (amphibians/most reptiles) and 2-chambered single circulation (fishes).",
        "examinersTrap": "Swapping left and right heart chambers—remember the right side always handles deoxygenated blood and the left side handles oxygenated blood.",
    },
    "reflex_arc_nervous_system": {
        "coreIntuition": "Like a wall-socket circuit breaker tripping instantly during a surge before the signal ever travels up to the building's main computer.",
        "boardAnswer": (
            "1. Thermoreceptors in skin detect heat and trigger an impulse along a **sensory neuron** [1 Mark].\n"
            "2. A **relay neuron in spinal cord** forms the **reflex arc**, passing the signal immediately to a **motor neuron** [1 Mark].\n"
            "3. Across the **synapse**, neurotransmitters excite the **effector muscle** (biceps) to withdraw the hand rapidly [1 Mark]."
        ),
        "competitiveBridge": "NEET Neurophysiology: At chemical synapses, action-potential arrival opens voltage-gated Ca2+ channels, releasing acetylcholine into the synaptic cleft to depolarize the post-synaptic membrane.",
        "examinersTrap": "Stating that reflex actions are decided by the cerebrum rather than routed directly through the spinal cord.",
    },
    "dihybrid_cross_inheritance": {
        "coreIntuition": "Flipping two separate coins at once: whether the first coin lands heads has zero effect on whether the second coin lands tails.",
        "boardAnswer": (
            "1. Crossing TTRR x ttrr yields F1 **dihybrid cross** progeny TtRr (all Tall Round) [1 Mark].\n"
            "2. Selfing TtRr produces 16 Punnett square combinations with **phenotypic ratio 9:3:3:1** (9 Tall Round : 3 Tall Wrinkled : 3 Dwarf Round : 1 Dwarf Wrinkled) [2 Marks].\n"
            "3. Emergence of **recombinant phenotypes** proves Mendel's **Law of Independent Assortment**, where two allele pairs **segregate independently** [1 Mark]."
        ),
        "competitiveBridge": "NEET Genetics: Independent assortment holds strictly for genes on non-homologous chromosomes (or far apart on the same chromosome); linked genes deviate from 9:3:3:1 toward parental types.",
        "examinersTrap": "Confusing the 9:3:3:1 phenotypic ratio with the 1:2:1:2:4:2:1:2:1 genotypic ratio.",
    },
    "solution_by_factorisation": {
        "coreIntuition": "Finding two puzzle numbers that multiply to the outer product (10) and add up to the middle coefficient (7).",
        "boardAnswer": (
            "1. For sqrt(2)x^2 + 7x + 5*sqrt(2) = 0, product a*c = 10; by **splitting the middle term** 7x = 2x + 5x [1 Mark].\n"
            "2. Factoring out the **common factor** sqrt(2)x from the first two terms: sqrt(2)x(x + sqrt(2)) + 5(x + sqrt(2)) = 0 [1 Mark].\n"
            "3. Therefore (sqrt(2)x + 5)(x + sqrt(2)) = 0 gives the **roots of the equation** x = -5/sqrt(2) and x = -sqrt(2) [1 Mark]."
        ),
        "competitiveBridge": "JEE Algebra: Always check discriminant D = b^2 - 4ac = 49 - 40 = 9 > 0 (perfect square) to predict rational/irrational root pairing quickly.",
        "examinersTrap": "Missing that 2 = sqrt(2) * sqrt(2) when extracting the common factor (x + sqrt(2)).",
    },
    "basic_proportionality_theorem": {
        "coreIntuition": "Projecting a triangle's shadow onto diverging rails: sliding a crossbar parallel to the base scales both side segments in the exact same proportion.",
        "boardAnswer": (
            "1. **Basic Proportionality Theorem** (Thales): Given triangle ABC with DE || BC; **construction**: join BE, CD and draw EN perpendicular to AB, DM perpendicular to AC [1 Mark].\n"
            "2. Compute **ratio of areas**: ar(ADE)/ar(BDE) = AD/DB and ar(ADE)/ar(DEC) = AE/EC [2 Marks].\n"
            "3. Triangles BDE and DEC lie on the **same base and between same parallels** DE || BC, so ar(BDE) = ar(DEC); hence AD/DB = AE/EC [2 Marks]."
        ),
        "competitiveBridge": "JEE Geometry: BPT underpins Ceva's theorem (concurrent cevians) and Menelaus' theorem (collinear transversal intersections) via signed segment ratios.",
        "examinersTrap": "Equating ar(BDE) = ar(DEC) without citing the theorem on triangles sharing the same base between the same parallels.",
    },
    "sum_of_first_n_terms_of_an_ap": {
        "coreIntuition": "A daily savings jar: if you know the total money after day n, today's deposit equals today's total minus yesterday's total.",
        "boardAnswer": (
            "1. Given **sum of n terms** S_n = 3n^2 + 5n, the **first term** is a_1 = S_1 = 3(1)^2 + 5(1) = 8 [1 Mark].\n"
            "2. S_2 = 3(4) + 5(2) = 22, so a_2 = S_2 - S_1 = 14, giving **common difference** d = a_2 - a_1 = 6 [1 Mark].\n"
            "3. Using the **nth term** formula a_n = a + (n - 1)d, a_20 = 8 + 19(6) = 122 [1 Mark]."
        ),
        "competitiveBridge": "JEE Sequences: Whenever S_n = An^2 + Bn (zero constant term), the sequence is an AP with d = 2A = 6 and a_1 = A + B = 8 immediately.",
        "examinersTrap": "Taking S_1 = 8 as the common difference d or substituting n = 20 into S_n instead of a_n.",
    },
    "non_cooperation_movement": {
        "coreIntuition": "Refusing to oil the gears of an unfair machine: when millions step back together, the apparatus comes to a peaceful standstill.",
        "boardAnswer": (
            "1. The **Non-Cooperation Movement** (1920-1922) operated as a **mass movement** via **surrender of titles**, **boycott of foreign cloth**, schools, courts, and council elections [2 Marks].\n"
            "2. In February 1922, protesters clashed with police at **Chauri Chaura** (Gorakhpur), setting a police station ablaze [1 Mark].\n"
            "3. Mahatma Gandhi withdrew the movement because it violated **Ahimsa**, believing satyagrahis needed deeper non-violent training [2 Marks]."
        ),
        "competitiveBridge": "UPSC Modern History: The 1922 withdrawal sparked the Swarajist vs No-Changer debate (C.R. Das, Motilal Nehru vs Rajendra Prasad, Patel) and reshaped Congress mass strategy.",
        "examinersTrap": "Attributing the withdrawal to British military suppression rather than Gandhi's strict moral commitment to non-violence.",
    },
    "frederic_sorrieu_utopian_visi": {
        "coreIntuition": "A grand world parade painted as an ideal dream where each nation walks under its own flag toward shared liberty.",
        "boardAnswer": (
            "1. In 1848, **Frederic Sorrieu** depicted a **utopian vision** of peoples from Europe and America marching in homage past the **Statue of Liberty** [1.5 Marks].\n"
            "2. Liberty holds the **Torch of Enlightenment** in one hand and the **Charter of the Rights of Man** in the other [1.5 Marks].\n"
            "3. On the ground lie **shattered symbols of absolutist institutions**, symbolizing the end of autocratic monarchies [1 Mark]."
        ),
        "competitiveBridge": "UPSC World History: Sorrieu's allegory captures 19th-century liberal nationalism linking popular sovereignty with nation-state formation prior to German and Italian unification.",
        "examinersTrap": "Treating Sorrieu's 1848 print as a photograph of an actual diplomatic summit rather than a utopian allegorical artwork.",
    },
    "conquest_disease_and_trade": {
        "coreIntuition": "An invisible biological Trojan horse: explorers won territories less by metal swords than by microscopic germs locals had never encountered.",
        "boardAnswer": (
            "1. Assertion (A) and Reason (R) are both TRUE, and (R) correctly explains (A) [1 Mark].\n"
            "2. **Spanish conquerors** carried **smallpox germs** that acted as a deadly **biological weapon** across the Americas [1 Mark].\n"
            "3. Centuries of isolation left indigenous communities with **lack of immunity**, which **paved the way for conquest** [1 Mark]."
        ),
        "competitiveBridge": "UPSC World History: The Columbian Exchange shifted global silver flows (Potosi mines to Europe and Asia) and reshaped demographic and agrarian trade networks.",
        "examinersTrap": "Assuming 16th-century smallpox spread was modern lab-engineered warfare rather than unimmunized epidemiological contact.",
    },
    "belgium_and_sri_lanka": {
        "coreIntuition": "Two roommates sharing a kitchen: agreeing on fair turns keeps harmony (Belgium), while one locking the fridge triggers conflict (Sri Lanka).",
        "boardAnswer": (
            "1. Sri Lanka adopted **Majoritarianism** via the 1956 Act making Sinhala the sole official language, causing **alienation of Sri Lankan Tamils** and civil war [2 Marks].\n"
            "2. The **Belgian Model of Accommodation** amended the constitution four times for **equal representation** of Dutch and French ministers, Brussels parity, and a **community government** [2 Marks].\n"
            "3. Respecting minority rights preserved unity in Belgium (chosen as EU headquarters) while majoritarian exclusion fractured Sri Lanka [1 Mark]."
        ),
        "competitiveBridge": "UPSC Indian Polity: Belgium exemplifies consociational power-sharing compared with India's linguistic state reorganization and Eighth Schedule protections.",
        "examinersTrap": "Confusing Belgium's Brussels capital majority (French-speaking) with its nationwide linguistic majority (Dutch-speaking).",
    },
    "what_makes_india_a_federal_co": {
        "coreIntuition": "A large household dividing duties: shared family security is managed by the center, local neighborhood matters by states, and common rules jointly.",
        "boardAnswer": (
            "1. India is a **holding together federation** with a **three-fold distribution** of legislative powers between Union and States [1.5 Marks].\n"
            "2. **Union List** covers national subjects (defence, banking, foreign affairs); **State List** covers local subjects (police, agriculture, trade) [1.5 Marks].\n"
            "3. **Concurrent List** covers shared subjects (education, forests; Union law prevails in conflict), while **residuary powers** (IT/cyber law) rest with the Union [2 Marks]."
        ),
        "competitiveBridge": "UPSC Indian Polity: Seventh Schedule (Article 246) codifies the three Lists, while Article 248 vests residuary powers in Parliament (Canadian model of cooperative federalism with unitary bias).",
        "examinersTrap": "Claiming that State law overrides Union law in case of conflict on the Concurrent List.",
    },
    "secular_state": {
        "coreIntuition": "A fair referee in a stadium who enforces equal rules for every team without wearing any single team's jersey.",
        "boardAnswer": (
            "1. Assertion (A) and Reason (R) are both TRUE, and (R) explains (A) [1 Mark].\n"
            "2. As a **secular state**, India has **no official religion**, guaranteeing **freedom to profess and practice** any faith [1 Mark].\n"
            "3. **Articles 15 and 25** enforce **prohibition of discrimination** on religious grounds while permitting state intervention for social equality [1 Mark]."
        ),
        "competitiveBridge": "UPSC Polity: Indian positive secularism (principled distance and equal respect under Articles 15, 25-28) contrasts with strict Western church-state separation.",
        "examinersTrap": "Equating Indian secularism with state hostility to religion rather than equal constitutional respect without a state religion.",
    },
    "soil_erosion_and_soil_conserv": {
        "coreIntuition": "Rain on dry sand: a focused hose carves deep ravines (gully erosion), whereas a wide wash strips away the smooth topsoil blanket (sheet erosion).",
        "boardAnswer": (
            "1. **Gully erosion** occurs when running water cuts deep channels making land unfit for cultivation (**bad land or ravines**, e.g., Chambal), whereas **sheet erosion** washes away topsoil uniformly over broad slopes [2 Marks].\n"
            "2. In hills, **contour ploughing** and **terrace farming** slow water flow down slopes [1.5 Marks].\n"
            "3. Strip cropping and planting **shelter belts** of trees stabilize dunes and reduce wind erosion in arid regions [1.5 Marks]."
        ),
        "competitiveBridge": "State DSC & UPSC Geography: Soil degradation patterns link directly to National Mission for Sustainable Agriculture watershed conservation and ravine reclamation programs.",
        "examinersTrap": "Confusing terrace farming (step cutting on hill slopes) with shelter belts (rows of trees planted to break wind velocity).",
    },
    "major_crops_rice": {
        "coreIntuition": "Rice is a thirsty tropical crop whose roots thrive in warm flooded fields under bright summer monsoon skies.",
        "boardAnswer": (
            "1. Rice is a **Kharif crop** requiring **temperature above 25°C**, high humidity, and **annual rainfall above 100 cm** [2 Marks].\n"
            "2. In regions of lower rainfall (Punjab, Haryana, western UP, parts of Rajasthan), dense **canal irrigation and tubewells** enable rice cultivation [1 Mark].\n"
            "3. Major rice-producing states include **West Bengal, Uttar Pradesh, Punjab**, Bihar, Assam, Odisha, and coastal deltas [1 Mark]."
        ),
        "competitiveBridge": "State DSC Geography: High-input paddy cultivation via tubewell irrigation in semi-arid Punjab/Haryana drives groundwater depletion debates and crop diversification policy.",
        "examinersTrap": "Classifying rice as a Rabi winter crop instead of a monsoon Kharif crop.",
    },
    "non_conventional_sources_of_e": {
        "coreIntuition": "Spending from a finite savings jar that eventually runs dry (coal) versus harvesting daily sunlight that renews every morning (solar).",
        "boardAnswer": (
            "1. **Conventional sources** (coal, petroleum, natural gas) are exhaustible and polluting, whereas **non-conventional sources** (solar, wind, tidal, biogas) are **renewable** and eco-friendly [2 Marks].\n"
            "2. India is a **tropical country** with abundant solar insolation, and **photovoltaic technology** converts sunlight directly into electricity [1.5 Marks].\n"
            "3. Solar energy boosts **rural electrification** and reduces dependence on firewood and dung cakes, conserving forests and manure [1.5 Marks]."
        ),
        "competitiveBridge": "UPSC Environment & Economy: India's National Solar Mission and International Solar Alliance leverage tropical solar potential to meet Net-Zero energy transition targets.",
        "examinersTrap": "Classifying large hydroelectricity as non-conventional in NCERT terms (NCERT places hydel power under conventional commercial sources).",
    },
    "money_as_medium_of_exchange": {
        "coreIntuition": "An official arcade token: the paper or plastic itself has no value, yet everyone accepts it because the issuing authority guarantees it.",
        "boardAnswer": (
            "1. Modern currency acts as a **medium of exchange** because it is **authorized by the government** of the country as legal tender [2 Marks].\n"
            "2. The **Reserve Bank of India** (RBI) issues currency notes and monitors banks to maintain minimum **cash reserve ratio** balances [1.5 Marks].\n"
            "3. RBI supervises formal lenders to ensure **priority sector lending** reaches small farmers and borrowers rather than only profit-making firms [1.5 Marks]."
        ),
        "competitiveBridge": "State DSC & UPSC Economics: RBI monetary policy tools (CRR, SLR, Repo rate) and priority-sector credit guidelines regulate liquidity and financial inclusion.",
        "examinersTrap": "Assuming modern fiat currency notes are backed dollar-for-dollar by physical gold bars rather than sovereign legal-tender guarantee.",
    },
    "division_of_sectors_as_organi": {
        "coreIntuition": "Five people pushing a cart that only needs two: everyone looks busy, yet removing three helpers does not slow the cart down at all.",
        "boardAnswer": (
            "1. **Disguised unemployment** (**underemployment**) occurs when more people work on a farm than required, so **marginal productivity is zero** [2 Marks].\n"
            "2. Shifting surplus workers (as in Laxmi's plot example) leaves total agricultural output unchanged while raising household income [1.5 Marks].\n"
            "3. **MGNREGA 2005** guarantees **100 days of guaranteed wage employment** per year in rural areas, or pays an unemployment allowance [1.5 Marks]."
        ),
        "competitiveBridge": "State DSC & UPSC Economics: Structural transformation from low-productivity primary sector to secondary/tertiary employment and statutory Right to Work under MGNREGA.",
        "examinersTrap": "Confusing disguised unemployment (working below potential) with open unemployment (having no work at all).",
    },
    "impact_of_globalisation_in_in": {
        "coreIntuition": "Opening a giant sea gate: huge cargo ships glide through smoothly, while small fishing boats struggle against the sudden waves.",
        "boardAnswer": (
            "1. Assertion (A) is FALSE: the **impact of globalisation has not been uniform** across all sections of Indian society [1 Mark].\n"
            "2. Reason (R) is TRUE: well-off consumers and MNCs gained, while **small producers hit hard** in batteries, plastics, and toys faced **flexible employment** and insecurity [1 Mark].\n"
            "3. Therefore (A) is false while (R) is true, highlighting the need for **fair globalisation** without **unfair trade barriers** [1 Mark]."
        ),
        "competitiveBridge": "State DSC & UPSC Indian Economy: Evaluates WTO trade asymmetries, informalization of labour, and policy support for MSMEs under equitable globalization.",
        "examinersTrap": "Marking Assertion (A) as true merely because urban consumers gained wider product choices and lower prices.",
    },
}


def validate_answer_layers(
    layers: LayeredAnswer | Dict[str, Any],
    subject: str = "science",
    requires_si_units: bool = False,
) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if isinstance(layers, LayeredAnswer):
        data = layers.model_dump()
    elif isinstance(layers, dict):
        data = layers
    else:
        return False, ["answerLayers must be a LayeredAnswer or dict"]

    for key in ("coreIntuition", "boardAnswer", "competitiveBridge", "examinersTrap"):
        val = data.get(key)
        if not isinstance(val, str) or not val.strip():
            errors.append(f"Missing or empty required layer: {key}")

    if errors:
        return False, errors

    full_text = " ".join(str(data[k]) for k in ("coreIntuition", "boardAnswer", "competitiveBridge", "examinersTrap"))
    for pattern in AI_CLICHE_PATTERNS:
        if pattern.search(full_text):
            errors.append(f"AI cliché violation: {pattern.pattern}")

    board_text = data["boardAnswer"]
    if not re.search(r"\*\*([^*]+)\*\*", board_text):
        errors.append("CBSE Board Answer must contain bold keywords formatted with **keyword**")
    if not re.search(r"\[(?:\d+(?:\.\d+)?|1\/2)\s*(?:Mark|Marks|mark|marks)\]", board_text):
        errors.append("CBSE Board Answer must contain step-wise mark distribution in brackets")

    if requires_si_units and not SI_UNIT_RE.search(board_text):
        errors.append("STEM Board Answer must include physical quantities with standard SI units")

    if subject == "social-science" and re.search(r"\b(jee|neet)\b", data["competitiveBridge"], re.I):
        errors.append("Humanities/Social Science Competitive Bridge must not reference JEE or NEET")

    return len(errors) == 0, errors


def _load_lesson_fallback(subject: str, chapter_id: str) -> Dict[str, Any]:
    resolved = resolve_chapter_slug(chapter_id)
    path = LESSONS_DIR / subject / f"{resolved}.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _deterministic_synthesize(state: AgentState) -> LayeredAnswer:
    analysis = state.analysis
    subject = (analysis.okf_filters.subject if analysis else state.subject_id) or "science"
    chapter_id = (analysis.okf_filters.chapter_id if analysis else state.chapter_id) or "general-chapter"
    topic_tag = analysis.okf_filters.topic_tag if analysis else "general"
    target_exam = analysis.target_exam if analysis else "CBSE_BOARD"

    if topic_tag in _TOPIC_PROFILES:
        prof = _TOPIC_PROFILES[topic_tag]
        return LayeredAnswer(
            coreIntuition=prof["coreIntuition"],
            boardAnswer=prof["boardAnswer"],
            competitiveBridge=prof["competitiveBridge"],
            examinersTrap=prof["examinersTrap"],
        )

    # Dynamic grounded synthesis from retrieved chunks and local lesson JSON
    chunks = state.retrieved_chunks or []
    lesson = _load_lesson_fallback(subject, chapter_id)
    concepts = lesson.get("concepts") or []
    misconceptions = lesson.get("common_misconceptions") or []
    worked = lesson.get("worked_examples") or []

    textbook_chunk = next((c for c in chunks if c.get("source_type") == "NCERT_TEXTBOOK"), None)
    sqp_chunk = next((c for c in chunks if c.get("source_type") == "CBSE_SQP"), None)
    exemplar_chunk = next((c for c in chunks if c.get("source_type") == "NCERT_EXEMPLAR"), None)

    analogy_src = ""
    if concepts and isinstance(concepts[0], dict):
        analogy_src = concepts[0].get("real_life_application") or concepts[0].get("real_life_example") or ""
    core_intuition = (
        f"Think of it like an everyday mechanism: {analogy_src.strip()}"
        if analogy_src
        else f"Think of {chapter_id.replace('-', ' ')} like a familiar everyday balance where changing one input produces a predictable, measurable shift."
    )

    keyword_term = (analysis.bm25_keywords[0] if analysis and analysis.bm25_keywords else chapter_id.replace("-", " "))
    tb_snippet = (textbook_chunk.get("content", "")[:260].strip() if textbook_chunk else "") or (
        concepts[0].get("purpose", "")[:260].strip() if concepts and isinstance(concepts[0], dict) else f"Core NCERT principle of {keyword_term}."
    )
    sqp_snippet = (sqp_chunk.get("content", "")[:220].strip() if sqp_chunk else "") or (
        f"Step-by-step derivation and verification for {keyword_term}."
    )
    needs_si = bool(re.search(r"\b\d+\s*(?:cm|m|v|a|ohm|d|w|j)\b", state.query, re.I))
    unit_line = "\n- Final result expressed with standard SI units (e.g. 10 ohm or +4 D) [1 Mark]." if needs_si else ""

    board_answer = (
        f"- **Core principle ({keyword_term})**: {tb_snippet} [1 Mark].\n"
        f"- **Marking-scheme application**: {sqp_snippet} [1 Mark].{unit_line}"
    )

    if subject == "social-science":
        exam_label = "UPSC CSE / State DSC" if target_exam in ("UPSC_CSE", "DSC_STATE") else "UPSC / DSC"
        comp_detail = (
            exemplar_chunk.get("content", "")[:240].strip()
            if exemplar_chunk
            else "Links Class 10 institutional, constitutional, and socio-economic themes to analytical civil services evaluation."
        )
        competitive_bridge = f"{exam_label} Analytical Bridge: {comp_detail}"
    else:
        exam_label = "NEET UG" if target_exam == "NEET_UG" else "JEE Main"
        shortcut = ""
        if worked and isinstance(worked[0], dict):
            shortcut = str(worked[0].get("competitive_shortcut") or worked[0].get("speed_mode") or "")
        comp_detail = shortcut or (exemplar_chunk.get("content", "")[:240].strip() if exemplar_chunk else f"Extends {keyword_term} to higher-order quantitative reasoning.")
        competitive_bridge = f"{exam_label} Foundation Bridge: {comp_detail}"

    trap_text = ""
    if misconceptions:
        first_misc = misconceptions[0]
        trap_text = json.dumps(first_misc) if isinstance(first_misc, dict) else str(first_misc)
    examiners_trap = (
        trap_text[:240].strip()
        if trap_text
        else f"Avoid omitting qualifying NCERT conditions, sign conventions, or key definitions in {keyword_term}."
    )

    return LayeredAnswer(
        coreIntuition=core_intuition,
        boardAnswer=board_answer,
        competitiveBridge=competitive_bridge,
        examinersTrap=examiners_trap,
    )


def _maybe_llm_synthesize(state: AgentState) -> Optional[LayeredAnswer]:
    if os.environ.get("CLASSX_OFFLINE_MODE") == "1":
        return None
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    analysis = state.analysis
    subject = (analysis.okf_filters.subject if analysis else state.subject_id) or "science"
    requires_si = bool(re.search(r"\b\d+\s*(?:cm|m|v|a|ohm|d|w|j)\b", state.query, re.I)) and subject != "social-science"
    try:
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OPENAI_BASE_URL") or (
            "https://openrouter.ai/api/v1" if os.environ.get("OPENROUTER_API_KEY") and not os.environ.get("OPENAI_API_KEY") else "https://api.openai.com/v1"
        )
        model = os.environ.get("TUTOR_MODEL") or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"
        llm = ChatOpenAI(api_key=api_key, base_url=base_url, model=model, temperature=0.2, timeout=15).with_structured_output(LayeredAnswer)
        context_text = "\n\n".join(
            f"[{c.get('source_type', 'NCERT')}] {c.get('content', '')[:600]}"
            for c in (state.retrieved_chunks or [])[:6]
        )
        discipline_rule = (
            "Subject is social-science: competitiveBridge MUST connect to UPSC CSE or State DSC and MUST NOT mention JEE or NEET."
            if subject == "social-science"
            else "Subject is STEM: competitiveBridge connects to JEE Main or NEET UG."
        )
        prompt = (
            "Synthesize a 4-layer NCERT Class 10 response strictly from the retrieved context.\n"
            "1. coreIntuition: simple everyday analogy for a 15-year-old.\n"
            "2. boardAnswer: CBSE marking-scheme answer with mandatory NCERT keywords in **bold** and bracketed marks like [1 Mark].\n"
            f"3. competitiveBridge: {discipline_rule}\n"
            "4. examinersTrap: one specific board/competitive mistake.\n"
            "Do NOT use AI clichés or mention any commercial coaching brands.\n\n"
            f"Question: {state.query}\nContext:\n{context_text}"
        )
        layers = llm.invoke(prompt)
        ok, _ = validate_answer_layers(layers, subject=subject, requires_si_units=requires_si)
        if ok:
            return layers
    except Exception:
        return None
    return None


def pedagogical_generator(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: generates the 4-layer pedagogical answer grounded in retrieved OKF chunks."""
    layers = _maybe_llm_synthesize(state) or _deterministic_synthesize(state)
    stages = list(state.pipeline_stages)
    stages.append(
        PipelineStage(
            node="pedagogical_generator",
            status="completed",
            output="4_LAYERS_GENERATED",
        )
    )
    return {
        "answer_layers": layers,
        "pipeline_stages": stages,
    }
