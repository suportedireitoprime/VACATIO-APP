const RadarLegislacaoContent = (_props: any) => (
  <div className="p-6 text-center text-muted-foreground">
    Radar de legislação indisponível neste projeto.
  </div>
);
export default RadarLegislacaoContent;
export const prefetchRadarData: (..._args: any[]) => Promise<any> = async () => null;
export const buildContextualTitle: (..._args: any[]) => string = () => '';
