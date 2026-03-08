"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "waiting" | "lighting" | "allLit" | "ready" | "finished";
type Rating = "JUMP START" | "ELITE" | "SOLID" | "BACKMARKER" | "ARE YOU EVEN TRYING";

const LIGHT_DELAY = 700;
const MIN_RANDOM_DELAY = 500;
const MAX_RANDOM_DELAY = 3000;

const getRating = (time: number): Rating => {
  if (time < 100) return "JUMP START";
  if (time < 180) return "ELITE";
  if (time < 250) return "SOLID";
  if (time < 350) return "BACKMARKER";
  return "ARE YOU EVEN TRYING";
};

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
};

const ROASTS: Record<Rating, string[]> = {
  "JUMP START": ["stewards are reviewing this", "that's a drive through penalty", "grosjean called, he wants his reputation back"],
  "ELITE": ["disgusting. we hate you.", "verstappen is nervous rn", "actually unreal. who ARE you"],
  "SOLID": ["not bad. not great. very p4.", "lando approves. still no wins tho", "respectable. barely."],
  "BACKMARKER": ["alonso has seen better.", "you're getting blue flagged rn", "at least you didn't DNF"],
  "ARE YOU EVEN TRYING": ["bwoah.", "kimi retired for THIS", "please. close. the tab."],
};

const TENOR_QUERIES: Record<Rating, string> = {
  "JUMP START": "f1 crash fail",
  "ELITE": "max verstappen f1 win",
  "SOLID": "lando norris f1 happy",
  "BACKMARKER": "fernando alonso f1 disappointed",
  "ARE YOU EVEN TRYING": "kimi raikkonen bwoah",
};

const fetchGif = async (query: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=8&contentfilter=high`
    );
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const random = data.results[Math.floor(Math.random() * data.results.length)];
    return random.media[0].gif.url;
  } catch (e) {
    return null;
  }
};

const getRandomRoast = (rating: Rating): string => {
  const roasts = ROASTS[rating];
  return roasts[Math.floor(Math.random() * roasts.length)];
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [litLights, setLitLights] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [lightsOutTime, setLightsOutTime] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isNewPB, setIsNewPB] = useState(false);
  const [isJumpStart, setIsJumpStart] = useState(false);
  const [backgroundGifs, setBackgroundGifs] = useState<Array<{ url: string; top: number; left: number; width: number; rotation: number }>>([]);
  const [resultGif, setResultGif] = useState<string | null>(null);
  const [roast, setRoast] = useState<string>("");
  const [showGoText, setShowGoText] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const pb = localStorage.getItem("f1-timer-pb");
    if (pb) {
      setPersonalBest(parseInt(pb, 10));
    }
  }, []);

  const formatPB = (ms: number | null): string => {
    if (ms === null) return "00.000";
    return formatTime(ms);
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (backgroundGifs.length === 0) {
      const queries = [
        "kimi raikkonen f1",
        "max verstappen f1",
        "lando norris f1",
        "charles leclerc ferrari f1",
        "fernando alonso f1",
        "lewis hamilton f1",
        "sebastian vettel f1",
        "carlos sainz f1",
        "oscar piastri f1",
        "george russell f1"
      ];
      
      const POSITIONS = [
        { top: '3%', left: '2%', rotation: -8 },
        { top: '5%', left: '38%', rotation: 5 },
        { top: '2%', left: '74%', rotation: -6 },
        { top: '35%', left: '1%', rotation: 7 },
        { top: '38%', left: '77%', rotation: -9 },
        { top: '72%', left: '3%', rotation: 6 },
        { top: '70%', left: '40%', rotation: -7 },
        { top: '71%', left: '76%', rotation: 8 },
        { top: '18%', left: '80%', rotation: -5 },
        { top: '55%', left: '0%', rotation: 4 },
      ];
      
      Promise.all(queries.map(query => fetchGif(query)))
        .then((urls) => {
          const validUrls = urls.filter((url): url is string => url !== null);
          if (validUrls.length > 0) {
            const positionedGifs = validUrls.map((url: string, index: number) => {
              const pos = POSITIONS[index] || POSITIONS[0];
              return {
                url,
                top: (window.innerHeight * parseFloat(pos.top) / 100),
                left: (window.innerWidth * parseFloat(pos.left) / 100),
                width: 190,
                rotation: pos.rotation,
              };
            });
            
            setBackgroundGifs(positionedGifs);
          } else {
            setBackgroundGifs([]);
          }
        })
        .catch(() => {
          setBackgroundGifs([]);
        });
    }
  }, [backgroundGifs.length]);

  useEffect(() => {
    if (rating && gameState === "finished") {
      const query = TENOR_QUERIES[rating];
      fetchGif(query).then((url) => {
        setResultGif(url);
      });
      setRoast(getRandomRoast(rating));
    }
  }, [rating, gameState]);

  const startSequence = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];

    setGameState("lighting");
    setLitLights(0);
    setReactionTime(null);
    setRating(null);
    setIsNewPB(false);
    setIsJumpStart(false);
    setShowGoText(false);

    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => {
        setLitLights(i);
        if (i === 5) {
          setGameState("allLit");
          const randomDelay = Math.random() * (MAX_RANDOM_DELAY - MIN_RANDOM_DELAY) + MIN_RANDOM_DELAY;
          const finalTimeout = setTimeout(() => {
            setLitLights(0);
            setGameState("ready");
            setLightsOutTime(Date.now());
            setShowGoText(true);
            setTimeout(() => setShowGoText(false), 500);
          }, randomDelay);
          timeoutsRef.current.push(finalTimeout);
        }
      }, i * LIGHT_DELAY);
      timeoutsRef.current.push(timeout);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (gameState === "waiting") {
      startSequence();
      return;
    }

    if (gameState === "ready" && lightsOutTime) {
      const time = Date.now() - lightsOutTime;
      
      if (time < 100) {
        timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        timeoutsRef.current = [];
        setIsJumpStart(true);
        setReactionTime(time);
        setRating("JUMP START");
        setGameState("finished");
        setLitLights(0);
        return;
      }

      setReactionTime(time);
      const newRating = getRating(time);
      setRating(newRating);
      setGameState("finished");

      if (personalBest === null || time < personalBest) {
        setPersonalBest(time);
        setIsNewPB(true);
        localStorage.setItem("f1-timer-pb", time.toString());
      }
    } else if (gameState === "lighting" || gameState === "allLit" || (gameState === "ready" && !lightsOutTime)) {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];
      setIsJumpStart(true);
      setReactionTime(0);
      setRating("JUMP START");
      setGameState("finished");
      setLitLights(0);
    }
  }, [gameState, lightsOutTime, personalBest, startSequence]);

  const reset = () => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];
    
    setGameState("waiting");
    setLitLights(0);
    setReactionTime(null);
    setRating(null);
    setLightsOutTime(null);
    setIsNewPB(false);
    setIsJumpStart(false);
    setResultGif(null);
    setRoast("");
    setShowGoText(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (gameState === "finished") {
          reset();
        } else {
          handleClick();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState, handleClick, reset]);

  const shareToTwitter = () => {
    // TODO: Add share functionality later
  };

  const getInstructionText = () => {
    if (gameState === "waiting") return "PRESS SPACE OR TAP TO BEGIN";
    if (gameState === "lighting") return "WAIT...";
    if (gameState === "allLit") return "...";
    if (showGoText) return "GO GO GO";
    return "";
  };

  if (gameState !== "finished") {
    return (
      <div className="min-h-screen bg-concrete noise-overlay vignette relative overflow-hidden">
        <div 
          className="fixed pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          {backgroundGifs.length > 0 ? (
            backgroundGifs.map((gif, index) => {
              const isGameActive = gameState === "lighting" || gameState === "allLit";
              return (
                <motion.img
                  key={`gif-${index}`}
                  src={gif.url}
                  alt="F1 meme"
                  className="absolute object-cover"
                  style={{
                    top: `${gif.top}px`,
                    left: `${gif.left}px`,
                    width: `${gif.width}px`,
                    height: `${gif.width}px`,
                    transform: `rotate(${gif.rotation}deg)`,
                    opacity: 0.32,
                  }}
                  initial={{ opacity: 0.32 }}
                  animate={{
                    opacity: isGameActive 
                      ? 0.05 
                      : [0.32, 0.42, 0.32],
                  }}
                  transition={{
                    opacity: {
                      duration: isGameActive ? 0.5 : 4,
                      repeat: isGameActive ? 0 : Infinity,
                      ease: "easeInOut",
                    },
                  }}
                />
              );
            })
          ) : (
            <>
              <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-[#E8002D]/20 to-transparent blur-3xl rounded-full" />
              <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-[#E8002D]/15 to-transparent blur-3xl rounded-full" />
              <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-[#E8002D]/20 to-transparent blur-3xl rounded-full" />
              <div className="absolute bottom-32 right-1/4 w-60 h-60 bg-gradient-to-br from-[#E8002D]/15 to-transparent blur-3xl rounded-full" />
            </>
          )}
        </div>

        {personalBest !== null && (
          <div className="absolute top-4 left-4 z-10">
            <div className="text-gray-400 text-xs uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-russo)' }}>
              PB
            </div>
            <div className="text-gray-200 text-lg font-mono font-bold tracking-wider">
              {formatPB(personalBest)}
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <h1
            className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-center mb-2"
            style={{ fontFamily: 'var(--font-russo)' }}
          >
            LIGHTS OUT.
          </h1>
          
          <p
            className="text-gray-300 text-xs sm:text-sm uppercase tracking-widest mb-12"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            how fast are you really?
          </p>

          <div className="relative flex flex-col items-center mb-8">
            <div className="w-full max-w-[90vw] sm:max-w-md h-3 sm:h-4 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-2 border-[#2a2a2a] rounded-t mb-2" />
            <div className="flex gap-2 sm:gap-3 md:gap-4 relative z-10">
              {[1, 2, 3, 4, 5].map((lightNum) => (
                <motion.div
                  key={lightNum}
                  className="relative riveted bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-2 sm:p-3 md:p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                  initial={false}
                >
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {[1, 2].map((lightIndex) => (
                      <motion.div
                        key={lightIndex}
                        className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full relative ${
                          litLights === lightNum ? "flicker" : ""
                        }`}
                        animate={{
                          backgroundColor: litLights >= lightNum ? "#E8002D" : "#0a0a0a",
                          boxShadow:
                            litLights >= lightNum
                              ? "0 0 20px rgba(232, 0, 45, 0.6), 0 0 40px rgba(232, 0, 45, 0.4), 0 0 60px rgba(232, 0, 45, 0.2), inset 0 0 15px rgba(232, 0, 45, 0.3)"
                              : "inset 0 0 8px rgba(0, 0, 0, 0.9)",
                          scale: litLights >= lightNum ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.15, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-center min-h-[2rem]">
            {showGoText ? (
              <motion.p
                className="text-[#E8002D] text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-russo)' }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                GO GO GO
              </motion.p>
            ) : (
              <p
                className="text-gray-300 text-sm sm:text-base uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-barlow)' }}
              >
                {getInstructionText()}
              </p>
            )}
          </div>
        </div>

        <div
          className="fixed inset-0 z-0 cursor-pointer"
          onClick={handleClick}
          onTouchStart={handleClick}
        />

        <div className="absolute bottom-4 left-0 right-0 text-center z-10">
          <p className="text-gray-500 text-sm">
            Made with ❤️ by{' '}
            <a
              href="https://x.com/bharzinstein76"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E8002D] hover:text-[#c40026] transition-colors"
            >
              Bharz
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (gameState === "finished" && reactionTime !== null && rating) {
    const gifRotation = (Math.random() * 6 - 3);
    
    return (
      <motion.div
        className="min-h-screen bg-concrete noise-overlay vignette flex flex-col items-center justify-center p-4 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-8 max-w-4xl w-full relative z-10">
          <div
            className="absolute inset-0 flex items-center justify-center text-[#E8002D]/15 font-black uppercase tracking-wider pointer-events-none overflow-hidden"
            style={{
              fontFamily: 'var(--font-russo)',
              fontSize: '15vw',
              whiteSpace: 'nowrap',
            }}
          >
            {rating}
          </div>

          <motion.div
            className={`relative text-7xl sm:text-8xl md:text-9xl lg:text-[12rem] font-mono font-black tracking-[0.1em] ${
              isJumpStart ? "text-[#E8002D]" : "text-white"
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatTime(reactionTime)}
          </motion.div>

          {roast && (
            <motion.p
              className="text-gray-300 text-sm sm:text-base uppercase tracking-widest text-center px-4"
              style={{ fontFamily: 'var(--font-barlow)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {roast}
            </motion.p>
          )}

          {resultGif && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 20, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: gifRotation }}
              transition={{ delay: 0.3 }}
            >
              <div className="absolute -top-2 left-1/4 w-12 h-4 bg-gray-300/30 rotate-[-15deg] shadow-lg" />
              <div className="absolute -top-2 right-1/4 w-12 h-4 bg-gray-300/30 rotate-[15deg] shadow-lg" />
              <img
                src={resultGif}
                alt={rating}
                className="max-w-[280px] border-2 border-[#2a2a2a] shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
                style={{ transform: `rotate(${gifRotation}deg)` }}
              />
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <motion.button
              onClick={shareToTwitter}
              className="px-8 py-4 bg-[#E8002D] hover:bg-[#d10026] text-white font-black text-base sm:text-lg uppercase tracking-wider transition-all active:scale-95"
              style={{ fontFamily: 'var(--font-russo)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              SHARE TO TWITTER
            </motion.button>

            <motion.button
              onClick={reset}
              className="px-8 py-4 border-2 border-[#E8002D] text-[#E8002D] hover:bg-[#E8002D]/10 font-black text-base sm:text-lg uppercase tracking-wider transition-all active:scale-95"
              style={{ fontFamily: 'var(--font-russo)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              TRY AGAIN
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-0 right-0 text-center z-10">
          <p className="text-gray-500 text-sm">
            Made with ❤️ by{' '}
            <a
              href="https://x.com/bharzinstein76"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E8002D] hover:text-[#c40026] transition-colors"
            >
              Bharz
            </a>
          </p>
        </div>
      </motion.div>
    );
  }

  return null;
}
