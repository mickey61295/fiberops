/*;=============================================   
; Author           :  Global Software's    
; Create date      :  04/08/2025    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  23/08/2025 11.45 AM 
; =============================================  */  

CREATE PROCEDURE Sp_UnitWiseJobOrderBal_Reg_OCR (@OrdId as nvarchar(1000))  AS  BEGIN  DECLARE @SQLSTR AS NVARCHAR(4000) Set @SQLSTR =N'
 
 select OrderMAs.jobno as OrdNo,ORdermas.finyear as ORdFinyear,OrderMAs.buyordNo,X.styleno,Fabdesc ,ColorDesc ,CountName ,
  
 sum(Jobkgs-RetKgs) JobOrderKgs,   sum(Jobmtr-RetMtr) JobOrderMtr ,sum(consKgs) ConsKgs,sum(ConsMtr) ConsMtr,sum(JobKgs-RetKgs-conskgs ) as BalKgs ,sum(JobMtr-RetMtr-ConsMtr ) as BalMtr,X.fabid ,X.colid,X.cntid from 	( 
 
 select  ordid,styleno,coyid,fabid ,colid,cntid,
 
 
 0 as Jobkgs,0 as JobMtr,0 as RetKgs,0 as RetMtr ,sum(Reqkgs) as Conskgs,sum(ReqMtr) as ConsMtr 
  from Pro_ReqJob_1 	group by ordid,styleno,coyid, fabid ,colid,cntid  union select 
  trs_del2.Ordid,trs_del2.styleno ,trs_del1.coycode, fabid,colid,cntid,sum(trs_del2.Kg) as JobKgs,    sum(trs_del2.mtr) as JobMtr,0 as RetKgs,0 as RetMtr,0 as ConsMtr,0 as Conskgs from  TRs_del1 inner join trs_del2 on trs_del1.id =trs_del2.id inner join stocktable on trs_del2.stockid=stocktable.stockid where trs_del1.trtype=-2 and DEltype in (''P'') group by trs_del1.coycode,trs_del2.ordid,trs_del2.styleno,   fabid,colid,cntid  
UNION Select trs_grn2.Ordid,trs_grn2.styleno ,trs_grn1.coycode, fabid,colid,cntid,0 as JobKgs,0 as JobMtr,sum(trs_grn2.RecKgs) as RetKgs ,sum(trs_grn2.Recmtr) as RetMtr ,0 as Conskgs,0 as ConsMtr from  trs_grn1 inner join trs_grn2 on trs_grn1.id =trs_grn2.id inner join stocktable on trs_grn2.stockid=stocktable.stockid where trs_grn1.Grntype=''FabricRetToUnit'' group by trs_grn1.coycode,trs_grn2.ordid,trs_grn2.styleno,   fabid,colid,cntid  )x INNER JOIN  OrderMas (nolock) on x.ordid=ordermas.ordid  LEFT OUTER JOIN Mas_fabric(nolock) on x.fabid=MAs_fabric.fabid LEFT OUTER JOIN  Mas_color (nolock) on  x.colid=MAs_color.ColID LEFT OUTER JOIN  Mas_count (nolock) on x.CntID =MAs_count.CountID  left outer join MAs_exporter unit (nolock) on x.coyid = unit.Expid   LEFT OUTER JOIN  Mas_Exporter on ordermas.expid= MAs_exporter.expid where 1 =1 'if len(RTRIM(@OrdId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND x.OrdId in (Select ID From fnSplitter(@OrdId))' end Set @SQLSTR=@SQLSTR+N' group by  OrderMAs.jobno, ORdermas.finyear,OrderMAs.buyordNo, X.styleno, Fabdesc, ColorDesc, CountName,X.fabid ,X.colid,X.cntid '   Exec SP_EXECUTESQL @SQLSTR,N'@OrdId nvarchar(200)', @OrdId=@OrdId end

