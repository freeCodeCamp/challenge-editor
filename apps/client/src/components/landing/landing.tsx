import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type SuperBlockStage } from '../../../interfaces/super-block';
import { API_LOCATION } from '../../utils/handle-request';

const Landing = () => {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState([] as SuperBlockStage[]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    fetch(API_LOCATION)
      .then(res => res.json() as Promise<SuperBlockStage[]>)
      .then(
        superBlockStages => {
          setLoading(false);
          setStages(superBlockStages);
        },
        (error: Error) => {
          setLoading(false);
          setError(error);
        }
      );
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <h1>Superblocks</h1>
      {stages.map(stage => (
        <div key={stage.stageName}>
          <h2>{stage.stageName}</h2>
          <ul>
            {stage.superBlocks.map(superblock => (
              <li key={superblock.name}>
                <Link to={`/${superblock.path}`}>{superblock.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Landing;
