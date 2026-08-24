/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  17/12/2022 10.05 AM 
; =============================================  */  
CREATE PROCEDURE ProductionExistQty (@OrdId int,@Coycode int,@ColID INT,@PartId int,@StyleID int,@StyleNo Varchar(30),@StageID INT,@SizeDesc Varchar(20),@LotNo Varchar(50),@JobOrdId int,@PrdType Char(1),@EntryID INT)
AS
 

 SELECT  IsNull(sum(ProdPcs),0) As Expr1 FROM Trs_AddPanelEntry A INNER JOIN Trs_AddPanelEntryQty B ON A.ID = B.ID INNER JOIN Mas_Size ON B.SizId = Mas_Size.SizeID  
INNER JOIN Trs_AddPanelEntryQty_Det C ON A.Id = C.Id 
/* INNER JOIN Prod_cutComponents D ON A.OrdId = D.Ordid And A.Styleno = D.Styleno And A.PartID = D.PartID And c.JobOrdId = D.JobId */
WHERE  C.JobOrdid = @JobOrdId AND A.ClrID = @ColID And ISNull(CutPanel_Assemble,'C') = @PrdType     and A.Partid= @PartId AND A.StyleID = @StyleID AND A.OrdID = @OrdId and A.StyleNo= @StyleNo and A.StageID= @StageID  and A.CoyId= @Coycode and MAs_size.sizedesc = @SizeDesc and A.id <> 0 And A.LotNo=@LotNo group by MAs_size.sizedesc  ORDER BY Mas_Size.SizeDesc


