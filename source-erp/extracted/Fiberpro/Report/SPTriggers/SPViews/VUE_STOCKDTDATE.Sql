/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  16/JUL/2018                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Commando-Meeting Review
; Change Person  :  ASLAM                
; Last Change Date :  13/Dec/2021 10.30 AM                  
; =============================================   */  
CREATE VIEW VUE_STOCKDTDATE AS
 
SELECT '1' AS TRN, Trs_GRN2.OrdID, isnull(Trs_GRN2.StyleNo,'') as StyleNo, Trs_GRN2.StockID, SUM(Trs_GRN2.RBag)-SUM(Isnull(Trs_GRN2.RejBag,0)) AS RB, SUM(Trs_GRN2.RecKgs)-SUM(ISnull(Trs_GRN2.RejKgs,0)) AS RK, SUM(Trs_GRN2.Recmtr)-SUM(ISnull(Trs_GRN2.Rejmtr,0))  AS Rm, 0 AS IB, 0 AS IK, 0 AS im, GodID, Trs_Grn1.Dt FROM Trs_Grn1 INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID GROUP BY Trs_GRN2.StockID, Trs_Grn1.Coycode, Trs_GRN2.OrdID, isnull(Trs_GRN2.StyleNo,''), GodID, Trs_Grn1.Dt   
UNION ALL /*Comment Break */ 
SELECT '2' AS trn, Trs_Del2.OrdID, isnull(Trs_Del2.StyleNo,'') as StyleNo, Trs_Del2.StockID, 0 AS RB, 0 AS Rk, 0 AS rm, SUM(Trs_Del2.BgRl) AS IB, SUM(Trs_Del2.Kg) AS IK, SUM(Trs_Del2.mtr) AS im, GodID, Trs_Del1.Dt FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID WHERE ((Trs_Del2.StockAddLess <> 'Add') OR (Trs_Del2.StockAddLess IS NULL)) And Trs_Del1.TrType<>-1 GROUP BY Trs_Del2.StockID, Trs_Del2.OrdID, isnull(Trs_Del2.StyleNo,''), GodID, Trs_Del1.Dt  
UNION ALL /*Comment Break */ 
SELECT '3' AS trn, Trs_Del2.TranOrdID as OrdID, isnull(Trs_Del2.StyleNo,'') as StyleNo, Trs_Del2.TranID, SUM(Trs_Del2.BgRl) AS RB, SUM(Trs_Del2.Kg) AS Rk, SUM(Trs_Del2.mtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, GodID, Trs_Del1.Dt  FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID WHERE Trs_del1.TrType = 3 GROUP BY Trs_Del2.TranID, Trs_Del2.TranOrdID, isnull(Trs_Del2.StyleNo,''), GodID, Trs_Del1.Dt  HAVING Trs_Del2.TranID > 0	  
UNION ALL /*Comment Break */   	 
SELECT '6' AS trn, Trs_Del2.TranOrdID, isnull(Trs_Del2.TranStyleNo,'') as StyleNo, Trs_Del2.TranID, SUM(Trs_Del2.BgRl) AS RB, SUM(Trs_Del2.Kg) AS Rk, SUM(Trs_Del2.mtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, GodID, Trs_Del1.Dt  FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID Where (Trs_del1.TrType = 8) GROUP BY Trs_Del2.TranID, Trs_Del2.TranOrdID, isnull(Trs_Del2.TranStyleNo,''), GodID, Trs_Del1.Dt  HAVING Trs_Del2.TranID > 0  

UNION ALL /*Comment Break */    
SELECT '4' AS trn, Trs_Opening.OrdID, isnull(Trs_Opening.StyleNo,'') as StyleNo, Trs_Opening.StockID, SUM(Trs_Opening.RlsBg) AS Rb, SUM(Trs_Opening.Kgs) AS Kg, SUM(Trs_Opening.MtrPc) AS mt, 0 AS irb, 0 AS ikg, 0 AS imt, GodID, OpenDt Dt FROM Trs_Opening INNER JOIN StockTable ON Trs_Opening.StockID = StockTable.StockID GROUP BY Trs_Opening.StockID, Trs_Opening.OrdID, isnull(Trs_Opening.StyleNo,''), GodID, OpenDt  
UNION ALL /*Comment Break */ 
SELECT '5' AS trn, Trs_Del2.OrdID, isnull(Trs_Del2.StyleNo,'') as StyleNo, Trs_Del2.StockID, SUM(Trs_Del2.BgRl) AS RB, SUM(Trs_Del2.Kg) AS Rk, SUM(Trs_Del2.mtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, GodID, Trs_Del1.Dt  FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID WHERE (Trs_Del2.StockAddLess = 'Add') GROUP BY Trs_Del2.StockID, Trs_Del2.OrdID, isnull(Trs_Del2.StyleNo,''), GodID, Trs_Del1.Dt    
UNION ALL /*Comment Break */  
SELECT '7' AS trn, Trs_Del2.OrdID, isnull(Trs_Del2.StyleNo,'')as StyleNo, Trs_Del2.StockID, 0 AS RB, 0 AS Rk, 0 AS rm, 0 AS IB, SUM(ISNULL(Trs_Del2.RUpdtkg, 0)) AS IK, SUM(ISNULL(Trs_Del2.Rupdtmtr, 0)) AS im, GodID, Trs_Del1.Dt  FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID GROUP BY Trs_Del2.StockID, Trs_Del2.OrdID, isnull(Trs_Del2.StyleNo,''), GodID, Trs_Del1.Dt  
UNION ALL /*Comment Break- cuttin Return fabric Ack  */   

SELECT '8' AS TRN, Stocktable.OrdID, isnull(Trs_Del2.StyleNo,'') as StyleNo, Trs_Del2.tranid as stockid, SUM(Trs_Del2.Arl) AS RB, SUM(Trs_Del2.Akg) AS RK, SUM(Trs_Del2.Amtr) AS Rm, 0 AS IB, 0 AS IK, 0 AS im, trs_cutapr.GodID,trs_cutapr.AprDt FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID inner join stocktable on Trs_Del2.tranid=stocktable.stockid inner join trs_cutapr on Trs_del2.aid=trs_cutapr.id where isnull(Trs_Del2.aid,0)<>0 and trtype=-2  GROUP BY Trs_Del2.tranid, Trs_Del1.Coycode
, Stocktable.OrdID, isnull(Trs_Del2.StyleNo,''),trs_cutapr. GodID, trs_cutapr.AprDt  

UNION ALL /*Comment Break */  

SELECT     '9' AS TRN, Trs_Del2.OrdId, '' AS StyleNo, Trs_Del2.StockID, SUM(Trs_Del2.BgRl) AS RB, SUM(Trs_Del2.Kg) AS Rk, SUM(Trs_Del2.mtr) 
AS rm, 0 AS IB, 0 AS IK, 0 AS im, Trs_Del1.Party AS GodID, Trs_Del1.Dt FROM   Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID WHERE  (Trs_Del1.TrType = 14) GROUP BY Trs_Del2.OrdId, Trs_Del2.StockID, Trs_Del1.Party, Trs_Del1.Dt   
union all   
SELECT     '9' AS TRN, Trs_Del2.OrdId,Trs_del2.styleno AS StyleNo, Trs_Del2.StockID, SUM(Trs_Del2.BgRl) AS RB, SUM(Trs_Del2.Kg) AS Rk, SUM(Trs_Del2.mtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, Trs_Del1.Party AS GodID, Trs_Del1.Dt FROM         Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID WHERE  (Trs_Del1.TrType = 15)  AND isnull(Trs_Del2.AID,0)<> 0  GROUP BY Trs_Del2.OrdId, Trs_Del2.StockID, Trs_Del1.Party, Trs_Del1.Dt,Trs_del2.styleno  
UNION ALL  
SELECT     '10' AS trn, Trs_Del2_5.OrdID, ISNULL(Trs_Del2_5.Styleno, '') AS StyleNo, Trs_Del2_5.StockID, 0 AS RB, 0 AS Rk,0 AS rm, SUM(Trs_Del2_5.BgRl) AS IB, SUM(Trs_Del2_5.Kg) AS IK, SUM(Trs_Del2_5.mtr) AS im, Trs_Del1_5.GodID,Trs_Del1_5.dt FROM         dbo.Trs_Del1 AS Trs_Del1_5 INNER JOIN dbo.Trs_Del2 AS Trs_Del2_5 ON Trs_Del1_5.ID = Trs_Del2_5.ID WHERE     (Trs_Del1_5.TrType = -1) and GRp=-4  GROUP BY Trs_Del2_5.StockID, Trs_Del2_5.OrdID, ISNULL(Trs_Del2_5.StyleNo, ''), Trs_Del1_5.GodID,Trs_Del1_5.dt HAVING      (Trs_Del2_5.OrdId > 0)    
UNION ALL  /*INSIDE UNIT ACK, (Which is Issued from Exporter-For acc */  
SELECT     '11' AS TRN, Trs_Del2_1.OrdId, Trs_Del2_1.StyleNo, Trs_Del2_1.TRANID as StockID,   SUM(Trs_Del2_1.Arl) AS RB, SUM(Trs_Del2_1.AKg)  AS Rk, SUM(Trs_Del2_1.AMtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, Trs_CutApr.GodID ,Trs_CutApr.Aprdt as dt FROM dbo.Trs_Del1 AS Trs_Del1_1 INNER JOIN dbo.Trs_Del2 AS Trs_Del2_1 ON Trs_Del1_1.ID = Trs_Del2_1.ID   inner join trs_cutapr  on trs_del2_1.aid=trs_cutapr.id   WHERE   (Trs_Del1_1.TrType = 7) AND isnull(Trs_Del2_1.aid,0)<>0 GROUP BY Trs_Del2_1.OrdId, Trs_Del2_1.TRanID,  Trs_Del2_1.StyleNo,Trs_CutApr.GodID ,Trs_CutApr.Aprdt  

UNION ALL  /*INSIDE UNIT ACK, (Which is Issued from Exporter-For Fabric, fabric transfer */  

SELECT     '12' AS TRN, Trs_Del2_1.OrdId, Trs_Del2_1.StyleNo, Trs_Del2_1.TRANID as StockID, SUM(Trs_Del2_1.Arl) AS RB, SUM(Trs_Del2_1.AKg) AS Rk, SUM(Trs_Del2_1.AMtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, trs_cutapr.GodID,Trs_CutApr.Aprdt as dt  FROM dbo.Trs_Del1 AS Trs_Del1_1 INNER JOIN dbo.Trs_Del2 AS Trs_Del2_1 ON Trs_Del1_1.ID = Trs_Del2_1.ID  inner join trs_cutapr  on trs_del2_1.aid=trs_cutapr.id  WHERE   (Trs_Del1_1.TrType in(1,17)) AND (Trs_Del1_1.prdID IS NOT NULL) and AKg is not null  GROUP BY Trs_Del2_1.OrdId, Trs_Del2_1.TRanID,  Trs_Del2_1.
StyleNo,trs_cutapr.GodID ,Trs_CutApr.Aprdt  
UNION ALL  
SELECT     '15' AS TRN, Trs_Del2_1.OrdId, Trs_Del2_1.StyleNo, Trs_Del2_1.TranId as StockID, SUM(Trs_Del2_1.Arl) AS RB, SUM(Trs_Del2_1.AKg)  AS Rk, SUM(Trs_Del2_1.AMtr) AS rm, 0 AS IB, 0 AS IK, 0 AS im, Trs_Del1_1.GodID ,Trs_CutApr.Aprdt as dt  FROM dbo.Trs_Del1 AS Trs_Del1_1 INNER JOIN dbo.Trs_Del2 AS Trs_Del2_1 ON Trs_Del1_1.ID = Trs_Del2_1.ID  inner join trs_cutapr  on trs_del2_1.aid=trs_cutapr.id 	WHERE   (Trs_Del1_1.TrType = 16) AND isnull(Trs_Del2_1.aid,0)<>0 GROUP BY Trs_Del2_1.OrdId, Trs_Del2_1.TranId,  Trs_Del2_1.StyleNo,Trs_Del1_1.GodID ,Trs_CutApr.Aprdt 

UNION ALL

SELECT     '16' AS TRN, Trs_Del2.OrdId, Trs_del2.StyleNo, Trs_Del2.TranID AS StockId,  Sum(Trs_Del2.BgRl) AS RB, Sum(Trs_Del2.Kg) AS RK, Sum(Trs_Del2.mtr) AS RM,  0 AS IB, 0 AS IK, 0 AS IM, Trs_Del1.GodID,Trs_del1.Dt FROM  Trs_ReadyToCut1 as  Trs_Del1 INNER JOIN Trs_ReadyToCut2 as Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN OrderMas ON Trs_Del2.OrdID = OrderMas.OrdId WHERE     Trs_Del2.TranID > 0 AND Trs_Del1.TrType = 20 GROUP BY Trs_Del2.OrdId, Trs_del2.StyleNo, Trs_Del2.TranID ,  Trs_Del1.GodID,Trs_del1.Dt

UNION ALL  
SELECT     '16' AS TRN, Trs_Del2.Ordid, Trs_Del2.StyleNo, Trs_Del2.stockid AS StockId,  0 AS RB, 0 AS RKs, 0 AS RM, Sum(Trs_Del2.BgRl) AS IB, Sum(Trs_Del2.Kg) AS IK, Sum(Trs_Del2.mtr) AS IM, Trs_Del1.GodID,Trs_Del1.Dt FROM  Trs_ReadyToCut1 as  Trs_Del1 INNER JOIN Trs_ReadyToCut2 as Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN OrderMas ON Trs_Del2.OrdID = OrderMas.OrdId inner join StockTable on trs_del2.StockID = StockTable.StockID WHERE     Trs_Del2.stockid > 0 AND Trs_Del1.TrType = 20 GROUP BY Trs_Del2.OrdId, Trs_del2.StyleNo, Trs_Del2.StockID ,  Trs_Del1.GodID,Trs_del1.Dt

